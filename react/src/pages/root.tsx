import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import { checkIsPgptHealthy } from '@/lib/pgpt';
import { useEffect } from 'react';
import { useLocalStorage } from 'usehooks-ts';

export const RootPage = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [environment, setEnvironment, deleteEnvironment] = useLocalStorage<string | undefined>('pgpt-url', undefined);

  const checkPrivateGptHealth = async (env: string) => {
    try {
      const isHealthy = await checkIsPgptHealthy(env);
      if (!isHealthy) {
        deleteEnvironment();
        const url = prompt('Please enter the URL of your Private GPT instance', 'http://localhost:8001',) || ''
        setEnvironment(url);
        checkPrivateGptHealth(url);
      }
      if (pathname === '/') {
        navigate('/chat');
      }
    } catch {
      alert('The Private GPT instance is not healthy');
      deleteEnvironment();
    }
  };

  useEffect(() => {
    if (!environment) {
      const url = 'http://localhost:8001'
      setEnvironment(url);
      checkPrivateGptHealth(url);
    } else {
      checkPrivateGptHealth(environment);
    }
  }, [environment]);

  if (environment) return <Outlet />;
  return <div>Loading...</div>;
};
