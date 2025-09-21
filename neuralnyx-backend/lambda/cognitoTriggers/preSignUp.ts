import { PreSignUpTriggerEvent, PreSignUpTriggerHandler } from 'aws-lambda';

/**
 * Cognito Pre-SignUp Lambda Trigger
 * Auto-confirms users during signup to allow immediate login
 */
export const handler: PreSignUpTriggerHandler = async (
  event: PreSignUpTriggerEvent
): Promise<PreSignUpTriggerEvent> => {
  console.log('PreSignUp trigger event:', JSON.stringify(event, null, 2));

  try {
    // Auto-confirm the user
    event.response.autoConfirmUser = true;

    // Auto-verify email (since we're not actually sending verification emails)
    event.response.autoVerifyEmail = true;

    console.log('User auto-confirmed:', {
      username: event.userName,
      email: event.request.userAttributes.email,
    });

    return event;
  } catch (error) {
    console.error('Error in PreSignUp trigger:', error);

    // If there's an error, don't auto-confirm (let the user go through normal flow)
    event.response.autoConfirmUser = false;
    event.response.autoVerifyEmail = false;

    return event;
  }
};
