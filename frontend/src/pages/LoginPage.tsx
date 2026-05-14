import AuthShell from '../components/AuthShell';
import LoginForm from '../components/LoginForm';

export default function LoginPage() {
  return (
    <AuthShell title="Login" subtitle="Welcome to Visitor">
      <LoginForm />
    </AuthShell>
  );
}
