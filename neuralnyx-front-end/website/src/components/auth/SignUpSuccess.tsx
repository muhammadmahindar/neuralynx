import React from 'react';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface SignUpSuccessProps {
  onContinueToLogin: () => void;
  userEmail?: string;
}

export const SignUpSuccess: React.FC<SignUpSuccessProps> = ({ 
  onContinueToLogin, 
  userEmail 
}) => {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <CardTitle className="text-2xl font-bold text-green-600">
          Account Created Successfully!
        </CardTitle>
        <CardDescription>
          {userEmail 
            ? `Your account has been created for ${userEmail}. Please sign in to continue.`
            : 'Your account has been created successfully. Please sign in to continue.'
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground text-center">
          <p>You can now sign in with your credentials to access your account.</p>
        </div>
        <Button 
          onClick={onContinueToLogin} 
          className="w-full"
        >
          Continue to Sign In
        </Button>
      </CardContent>
    </Card>
  );
};
