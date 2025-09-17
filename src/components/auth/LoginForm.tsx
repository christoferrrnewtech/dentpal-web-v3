import LoginFormView from "./LoginFormView";
import { useLoginForm } from "./useLoginForm";

type Props = {
  onLoginSuccess: () => void;
};

export default function LoginForm({ onLoginSuccess }: Props) {
  const { state, action } = useLoginForm({ onLoginSuccess });
  return (
    <LoginFormView
      email={state.email}
      password={state.password}
      rememberMe={state.rememberMe}
      showPassword={state.showPassword}
      loading={state.loading}
      error={state.error}
      showErrorDialog={state.showErrorDialog}
      errorMessage={state.errorMessage}
      onEmail={action.setEmail}
      onPassword={action.setPassword}
      onRemember={action.setRememberMe}
      onTogglePassword={() => action.setShowPassword(!state.showPassword)}
      onCloseError={() => action.setShowErrorDialog(false)}
      onSubmit={action.handleSubmit}
    />
  );
}