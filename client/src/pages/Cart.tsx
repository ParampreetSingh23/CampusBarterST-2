import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';
import { CartItem, Item } from '@shared/schema';
import { Trash2, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import { PaymentModal } from '@/components/PaymentModal';

export default function Cart() {
 const { toast } = useToast();
 const queryClient = useQueryClient();
 const [isPaymentOpen, setIsPaymentOpen] = useState(false);

 const { data: cartItems, isLoading } = useQuery<(CartItem & { item: Item })[]>({
  queryKey: ['/api/cart'],
 });

 const removeFromCartMutation = useMutation({
  mutationFn: async (itemId: string) => {
   await apiRequest('DELETE', `/api/cart/${itemId}`);
  },
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
   toast({
    title: "Item removed",
    description: "The item has been removed from your cart.",
   });
  },
  onError: () => {
   toast({
    title: "Error",
    description: "Failed to remove item from cart.",
    variant: "destructive",
   });
  }
 });

 const checkoutMutation = useMutation({
  mutationFn: async () => {
   await apiRequest('POST', '/api/checkout');
  },
  onSuccess: () => {
   queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
   queryClient.invalidateQueries({ queryKey: ['/api/items'] });
   toast({
    title: "Order Placed!",
    description: "Your order has been placed successfully.",
   });
   setIsPaymentOpen(false);
   // Optional: Redirect to orders page if I created one, but for now just clear cart awareness
  },
  onError: (error: any) => {
   toast({
    title: "Checkout Failed",
    description: error.message || "Failed to place order.",
    variant: "destructive",
   });
  }
 });

 const totalPrice = cartItems?.reduce((sum, cartItem) => {
  if (cartItem.item.itemType === 'sell' && cartItem.item.price) {
   return sum + parseFloat(cartItem.item.price);
  }
  return sum;
 }, 0) || 0;

 return (
  <div className="min-h-screen bg-background">
   <Navbar />

   <main className="container mx-auto px-6 py-8 max-w-7xl">
    <h1 className="font-heading text-4xl font-bold mb-6">Your Cart</h1>

    {isLoading ? (
     <div className="space-y-4">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
     </div>
    ) : !cartItems || cartItems.length === 0 ? (
     <div className="text-center py-12">
      <p className="text-xl text-muted-foreground mb-6">Your cart is empty.</p>
      <Link href="/dashboard">
       <Button>Browse Items</Button>
      </Link>
     </div>
    ) : (
     <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-4">
       {cartItems.map((cartItem) => (
        <Card key={cartItem.id} className="p-4 flex gap-4 items-center">
         <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-md bg-muted">
          <img
           src={cartItem.item.imageUrl}
           alt={cartItem.item.title}
           className="h-full w-full object-cover"
          />
         </div>
         <div className="flex-1">
          <Link href={`/items/${cartItem.item.id}`} className="hover:underline">
           <h3 className="font-semibold text-lg">{cartItem.item.title}</h3>
          </Link>
          <p className="text-sm text-muted-foreground">{cartItem.item.category}</p>
          {cartItem.item.itemType === 'sell' && cartItem.item.price && (
           <p className="font-bold mt-1 text-primary">
            ${parseFloat(cartItem.item.price).toFixed(2)}
           </p>
          )}
          {cartItem.item.itemType === 'barter' && (
           <p className="text-sm text-muted-foreground mt-1">
            Barter: {cartItem.item.expectedExchange}
           </p>
          )}
         </div>
         <Button
          variant="ghost"
          size="icon"
          onClick={() => removeFromCartMutation.mutate(cartItem.item.id)}
          disabled={removeFromCartMutation.isPending}
         >
          <Trash2 className="h-5 w-5 text-destructive" />
         </Button>
        </Card>
       ))}
      </div>

      <div className="lg:col-span-1">
       <Card className="p-6 sticky top-24">
        <h2 className="text-xl font-semibold mb-4">Summary</h2>
        <div className="flex justify-between mb-2">
         <span>Items</span>
         <span>{cartItems.length}</span>
        </div>
        <div className="flex justify-between mb-4 font-bold text-lg">
         <span>Total (Buy Only)</span>
         <span>${totalPrice.toFixed(2)}</span>
        </div>
        <Button
         className="w-full gap-2"
         onClick={() => setIsPaymentOpen(true)}
         disabled={checkoutMutation.isPending || cartItems.length === 0}
        >
         Checkout <ArrowRight className="h-4 w-4" />
        </Button>
       </Card>
      </div>
     </div >
    )
    }

    <PaymentModal
     isOpen={isPaymentOpen}
     onClose={() => setIsPaymentOpen(false)}
     onConfirm={() => checkoutMutation.mutate()}
     isLoading={checkoutMutation.isPending}
     totalAmount={totalPrice}
    />
   </main >
  </div >
 );
}
