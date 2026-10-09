import { loginAction } from '@/lib/auth-actions';

interface Props {
  className: string;
  children: React.ReactNode;
}

export function LoginButton({ className, children }: Props) {
  return (
    <form action={loginAction}>
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  );
}
