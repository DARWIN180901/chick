import { Link } from 'react-router-dom';

export default function Unauthorized() {
  return (
    <div className="login-wrap"><div className="card login-card">
      <h1>Access denied</h1><p className="muted">Your account cannot open this page.</p>
      <Link className="btn btn-primary" to="/">Back to my dashboard</Link>
    </div></div>
  );
}
