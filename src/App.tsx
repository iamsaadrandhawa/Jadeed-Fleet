import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { useAuthStore } from "@/shared/store/authStore";
import { AppRouter } from "@/routes/AppRouter";

function App() {
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    return init();
  }, [init]);

  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
}

export default App;
