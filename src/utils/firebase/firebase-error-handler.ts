export const getFirebaseErrorMessage = (error: any) => {
  switch (error?.code) {
    case 'auth/user-not-found':
      return 'User not found';
    case 'auth/invalid-credential':
      return 'Invalid credentials';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'auth/operation-not-allowed':
      return 'Operation not allowed';
    case 'auth/email-already-in-use':
      return 'Email already in use';
    case 'auth/weak-password':
      return 'Weak password';
    case 'auth/invalid-email':
      return 'Invalid email';
    case 'auth/user-token-expired':
      return 'User token expired. Please sign in again.';
    case 'auth/provider-already-linked':
      return 'Provider already linked';
    case 'auth/credential-already-in-use':
      return 'Credential already in use';
    default:
      return error?.message || error?.code || 'Something went wrong';
  }
};
