import * as AWS from 'aws-sdk';
import { getCognito, getCognitoConfig } from '../utils/awsClients';
import { ValidationError } from '../utils/httpResponses';

export interface SignupRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username?: string;
}

export interface SignupResponse {
  userSub: string;
  userConfirmed: boolean;
  message: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: {
    sub: string;
    email: string;
    username: string;
  };
}

export interface UserInfo {
  sub: string;
  email: string;
  username: string;
}

export class AuthService {
  private cognito: AWS.CognitoIdentityServiceProvider;

  constructor() {
    this.cognito = getCognito();
  }

  /**
   * Validate email format
   */
  private validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError('email', 'Invalid email format', email);
    }
  }

  /**
   * Validate password strength
   */
  private validatePassword(password: string): void {
    if (!password || password.length < 8) {
      throw new ValidationError(
        'password',
        'Password must be at least 8 characters long'
      );
    }
  }

  /**
   * Decode JWT token payload
   */
  private decodeJwtPayload(token: string): any {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT token format');
      }
      return JSON.parse(Buffer.from(parts[1], 'base64').toString());
    } catch (error) {
      throw new Error('Failed to decode JWT token');
    }
  }

  /**
   * Extract user info from ID token
   */
  private extractUserInfo(idToken: string, email: string): UserInfo {
    try {
      const payload = this.decodeJwtPayload(idToken);
      return {
        sub: payload.sub || '',
        email: payload.email || email,
        username: payload['cognito:username'] || email,
      };
    } catch (error) {
      console.warn(
        'Failed to decode ID token, using email as fallback:',
        error
      );
      return {
        sub: '',
        email: email,
        username: email,
      };
    }
  }

  /**
   * Register a new user
   */
  async signup(request: SignupRequest): Promise<SignupResponse> {
    const { email, password, firstName, lastName, username } = request;

    // Validate input
    if (!email || !password || !firstName || !lastName) {
      throw new ValidationError(
        'input',
        'Email, password, firstName, and lastName are required'
      );
    }

    this.validateEmail(email);
    this.validatePassword(password);

    // Get Cognito configuration
    const config = await getCognitoConfig();

    // Prepare signup parameters
    const signUpParams: AWS.CognitoIdentityServiceProvider.SignUpRequest = {
      ClientId: config.userPoolClientId,
      Username: email, // Use email as username
      Password: password,
      UserAttributes: [
        {
          Name: 'email',
          Value: email,
        },
        {
          Name: 'given_name',
          Value: firstName,
        },
        {
          Name: 'family_name',
          Value: lastName,
        },
      ],
    };

    // Add username if provided
    if (username) {
      signUpParams.UserAttributes?.push({
        Name: 'preferred_username',
        Value: username,
      });
    }

    console.log('Attempting user signup for:', email);

    try {
      const signUpResult = await this.cognito.signUp(signUpParams).promise();

      console.log('User signup successful:', signUpResult.UserSub);

      // For LocalStack, auto-confirm the user
      if (!signUpResult.UserConfirmed) {
        console.log('Auto-confirming user for LocalStack...');
        try {
          await this.cognito
            .adminConfirmSignUp({
              UserPoolId: config.userPoolId,
              Username: email,
            })
            .promise();
          console.log('User auto-confirmed successfully');
        } catch (confirmError) {
          console.warn(
            'Auto-confirmation failed, user may need manual confirmation:',
            confirmError
          );
        }
      }

      return {
        userSub: signUpResult.UserSub!,
        userConfirmed: signUpResult.UserConfirmed || true, // Assume confirmed for LocalStack
        message: 'User registered successfully',
      };
    } catch (error: any) {
      console.error('Signup error:', error);

      if (error.code === 'UsernameExistsException') {
        throw new ValidationError(
          'email',
          'User with this email already exists',
          email
        );
      } else if (error.code === 'InvalidPasswordException') {
        throw new ValidationError(
          'password',
          'Password does not meet requirements'
        );
      } else if (error.code === 'InvalidParameterException') {
        throw new ValidationError(
          'input',
          'Invalid input parameters',
          error.message
        );
      } else {
        throw new Error('Failed to register user');
      }
    }
  }

  /**
   * Authenticate user and return tokens
   */
  async login(request: LoginRequest): Promise<LoginResponse> {
    const { email, password } = request;

    // Validate input
    if (!email || !password) {
      throw new ValidationError(
        'email/password',
        'Email and password are required'
      );
    }

    this.validateEmail(email);

    // Get Cognito configuration
    const config = await getCognitoConfig();

    // Prepare authentication parameters
    const authParams: AWS.CognitoIdentityServiceProvider.InitiateAuthRequest = {
      ClientId: config.userPoolClientId,
      AuthFlow: 'USER_PASSWORD_AUTH',
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    };

    console.log('Attempting user login for:', email);

    try {
      const authResult = await this.cognito.initiateAuth(authParams).promise();

      if (!authResult.AuthenticationResult) {
        throw new Error('Authentication failed - no tokens received');
      }

      const tokens = authResult.AuthenticationResult;
      console.log(
        'User login successful:',
        tokens.AccessToken?.substring(0, 20) + '...'
      );

      // Extract user information from ID token
      const userInfo = this.extractUserInfo(tokens.IdToken!, email);

      return {
        accessToken: tokens.AccessToken!,
        idToken: tokens.IdToken!,
        refreshToken: tokens.RefreshToken!,
        tokenType: 'Bearer',
        expiresIn: tokens.ExpiresIn || 3600,
        user: userInfo,
      };
    } catch (error: any) {
      console.error('Login error:', error);

      if (error.code === 'NotAuthorizedException') {
        throw new ValidationError('credentials', 'Invalid email or password');
      } else if (error.code === 'UserNotFoundException') {
        throw new ValidationError('email', 'User not found');
      } else if (error.code === 'UserNotConfirmedException') {
        throw new ValidationError(
          'account',
          'User account not confirmed. Please confirm your account before logging in'
        );
      } else if (error.code === 'TooManyRequestsException') {
        throw new ValidationError(
          'rate_limit',
          'Too many login attempts. Please try again later'
        );
      } else if (error.code === 'InvalidParameterException') {
        throw new ValidationError(
          'input',
          'Invalid input parameters',
          error.message
        );
      } else {
        throw new Error('Login failed');
      }
    }
  }

  /**
   * Verify user exists in Cognito (for token validation)
   */
  async verifyUser(userId: string): Promise<boolean> {
    try {
      const config = await getCognitoConfig();

      await this.cognito
        .adminGetUser({
          UserPoolId: config.userPoolId,
          Username: userId,
        })
        .promise();

      console.log(`User ${userId} verified in Cognito`);
      return true;
    } catch (error: any) {
      if (error.code === 'UserNotFoundException') {
        console.log(`User ${userId} not found in Cognito`);
        return false;
      }
      console.error(`Failed to verify user ${userId}:`, error);
      throw new Error(`Failed to verify user: ${error.message}`);
    }
  }

  /**
   * Validate JWT token
   */
  async validateToken(token: string): Promise<UserInfo> {
    // Remove 'Bearer ' prefix if present
    const jwtToken = token.startsWith('Bearer ') ? token.substring(7) : token;

    // Decode and validate token
    const payload = this.decodeJwtPayload(jwtToken);

    console.log('JWT payload:', JSON.stringify(payload, null, 2));

    // Check if token is expired
    const currentTime = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < currentTime) {
      throw new Error('Token has expired');
    }

    // Get configuration and validate issuer
    const config = await getCognitoConfig();
    console.log('Token issuer validation:', {
      tokenIssuer: payload.iss,
      expectedIssuer: config.userPoolIssuer,
      match: payload.iss === config.userPoolIssuer,
    });

    if (payload.iss !== config.userPoolIssuer) {
      throw new Error(
        `Invalid token issuer. Expected: ${config.userPoolIssuer}, Got: ${payload.iss}`
      );
    }

    // Verify user still exists in Cognito
    const userExists = await this.verifyUser(payload.sub);
    if (!userExists) {
      throw new Error('User no longer exists - token invalid');
    }

    return {
      sub: payload.sub || 'user',
      email: payload.email || '',
      username:
        payload.email || payload['cognito:username'] || payload.sub || 'user',
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string): Promise<LoginResponse> {
    const cognito = await getCognito();
    const config = await getCognitoConfig();

    try {
      const params = {
        ClientId: config.userPoolClientId,
        AuthFlow: 'REFRESH_TOKEN_AUTH',
        AuthParameters: {
          REFRESH_TOKEN: refreshToken,
        },
      };

      const result = await cognito.initiateAuth(params).promise();

      if (!result.AuthenticationResult) {
        throw new Error('Failed to refresh token');
      }

      const { AccessToken, IdToken, TokenType, ExpiresIn } =
        result.AuthenticationResult;

      if (!AccessToken || !IdToken) {
        throw new Error('Invalid token response');
      }

      // Decode ID token to get user info
      const idTokenPayload = this.decodeJwtPayload(IdToken);
      const userInfo = this.extractUserInfo(
        IdToken,
        idTokenPayload.email || ''
      );

      return {
        accessToken: AccessToken,
        idToken: IdToken,
        refreshToken: '', // Refresh token not returned in refresh response
        tokenType: TokenType || 'Bearer',
        expiresIn: ExpiresIn || 3600,
        user: userInfo,
      };
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw new Error('Invalid refresh token');
    }
  }
}
