import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <h1 className="text-6xl font-bold gradient-text">404</h1>
        <p className="text-xl text-muted-foreground mb-4">Oops! This trading floor doesn't exist</p>
        <a href="/" className="text-primary hover:text-primary/80 underline transition-colors">
          Return to Trading Dashboard
        </a>
      </div>
    </div>
  );
};

export default NotFound;
