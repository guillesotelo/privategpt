import {
  RouteObject,
  RouterProvider,
  createBrowserRouter,
} from 'react-router-dom';

import { ChatPage } from './pages/chat';
import { PromptPage } from './pages/prompt';
import { RootPage } from './pages/root';
import './sass/app.scss'
import { AppProvider } from './AppContext';

const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootPage />,
    children: [
      {
        path: 'chat',
        element: <ChatPage />,
      },
      {
        path: 'prompt',
        element: <PromptPage />,
      },
    ],
  },
];

function App() {
  return (
    <AppProvider>
      <RouterProvider router={createBrowserRouter(routes)} />
    </AppProvider>
  )
}

export default App;
