import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Dashboard from "@/pages/Dashboard";
import AddItem from "@/pages/AddItem";
import ItemDetails from "@/pages/ItemDetails";
import Messages from "@/pages/Messages";
import Cart from "@/pages/Cart";
import Wishlist from "@/pages/Wishlist";
import NotFound from "@/pages/not-found";

function HomeRedirect() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Redirect to="/dashboard" /> : <Redirect to="/login" />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/dashboard">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/items/new">
        <ProtectedRoute>
          <AddItem />
        </ProtectedRoute>
      </Route>
      <Route path="/items/:id" component={ItemDetails} />
      <Route path="/messages">
        <ProtectedRoute>
          <Messages />
        </ProtectedRoute>
      </Route>
      <Route path="/cart">
        <ProtectedRoute>
          <Cart />
        </ProtectedRoute>
      </Route>
      <Route path="/wishlist">
        <ProtectedRoute>
          <Wishlist />
        </ProtectedRoute>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
