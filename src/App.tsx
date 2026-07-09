import { Routers } from './routes/routes';
import { Toaster } from 'sonner';

function App() {
  return (
    <>
      <Routers />
      <Toaster position="top-right" richColors />
    </>
  );
}

export default App;