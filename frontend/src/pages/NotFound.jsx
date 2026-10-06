import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="login-wrap"><div className="card login-card">
      <h1>404</h1><p className="muted">This page does not exist.</p>
      <Link className="btn btn-primary" to="/">Go home</Link>
    </div></div>
  );
}
