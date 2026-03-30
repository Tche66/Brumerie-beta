import { Outlet } from 'react-router';
import { BottomNav } from './BottomNav';

export function AppLayout() {
  return (
    <>
      <Outlet />
      <BottomNav />
    </>
  );
}
