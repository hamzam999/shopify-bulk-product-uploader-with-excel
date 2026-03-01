import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import Wizard from "@/pages/Wizard";

function App() {
  return (
    <ThemeProvider>
      <Wizard />
      <Toaster richColors position="top-right" />
    </ThemeProvider>
  );
}

export default App;
