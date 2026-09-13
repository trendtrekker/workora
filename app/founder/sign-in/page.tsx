export default function FounderSignIn() {
  return <main><p>Workora / Founder console</p><h1>Sign in</h1><form method="post" action="/api/v1/founder/auth/sign-in"><label>Email<input name="email" type="email" required /></label><label>Password<input name="password" type="password" required /></label><button type="submit">Continue securely</button></form></main>;
}
