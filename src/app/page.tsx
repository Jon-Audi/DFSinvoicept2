import { redirect } from 'next/navigation';

export default function RootPage() {
  // This will automatically redirect any visits to the root path "/"
  // to the "/dashboard" path within the (app) group.
  redirect('/dashboard');
}
