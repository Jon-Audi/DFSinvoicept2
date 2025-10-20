
import { redirect } from 'next/navigation';

export default function HomePage() {
  // This will automatically redirect any visits to the root path "/"
  // to the "/dashboard" path.
  redirect('/dashboard');
}

    