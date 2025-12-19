import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRoute, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Navbar } from '@/components/Navbar';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { ArrowLeft, Send, User as UserIcon, Calendar, Tag, ShoppingCart, Heart } from 'lucide-react';
import { Item, User, Message } from '@shared/schema';
import { formatDistanceToNow } from 'date-fns';

export default function ItemDetails() {
  const [, params] = useRoute('/items/:id');
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [messageText, setMessageText] = useState('');

  const { data: item, isLoading: itemLoading } = useQuery<Item & { user: User }>({
    queryKey: ['/api/items', params?.id],
    enabled: !!params?.id,
  });

  const { data: messages, isLoading: messagesLoading } = useQuery<(Message & { sender: User })[]>({
    queryKey: ['/api/messages', params?.id],
    enabled: !!params?.id,
  });

  const addToCartMutation = useMutation({
    mutationFn: async () => {
      if (!item) return;
      await apiRequest('POST', '/api/cart', { itemId: item.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      toast({
        title: "Added to Cart",
        description: "Item has been added to your cart.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add item to cart. It might already be there.",
        variant: "destructive",
      });
    }
  });

  const addToWishlistMutation = useMutation({
    mutationFn: async () => {
      if (!item) return;
      await apiRequest('POST', '/api/wishlist', { itemId: item.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wishlist'] });
      toast({
        title: "Added to Wishlist",
        description: "Item has been added to your wishlist.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add item to wishlist. It might already be there.",
        variant: "destructive",
      });
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!item) return;
      const res = await apiRequest('POST', '/api/messages', {
        itemId: item.id,
        receiverId: item.userId,
        messageText: text,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages', params?.id] });
      setMessageText('');
      toast({
        title: 'Message sent',
        description: 'Your message has been sent to the seller.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send message.',
        variant: 'destructive',
      });
    },
  });

  const handleSendMessage = () => {
    if (messageText.trim()) {
      sendMessageMutation.mutate(messageText);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (itemLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-6 py-8 max-w-6xl">
          <Skeleton className="h-8 w-32 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3">
              <Skeleton className="w-full aspect-[4/3] rounded-xl" />
            </div>
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-6 py-8 max-w-6xl">
          <div className="text-center py-20">
            <h2 className="font-heading text-2xl font-semibold mb-2">Item not found</h2>
            <p className="text-muted-foreground mb-6">This item may have been removed.</p>
            <Button onClick={() => setLocation('/dashboard')}>Back to Dashboard</Button>
          </div>
        </main>
      </div>
    );
  }

  const isOwnItem = user?.id === item.userId;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-6 py-8 max-w-6xl">
        <Button
          variant="ghost"
          className="mb-6 -ml-3"
          onClick={() => setLocation('/dashboard')}
          data-testid="button-back"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to listings
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3">
            <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-muted mb-4">
              <img
                src={item.imageUrl}
                alt={item.title}
                className="object-cover w-full h-full"
                data-testid="img-item"
              />
              <Badge
                className="absolute top-4 right-4"
                variant={item.itemType === 'barter' ? 'default' : 'secondary'}
                data-testid="badge-type"
              >
                {item.itemType === 'barter' ? 'Barter' : 'For Sale'}
              </Badge>
            </div>

            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-3">Description</h3>
                <p className="text-foreground whitespace-pre-wrap" data-testid="text-description">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="font-heading text-3xl font-bold mb-4" data-testid="text-title">
                {item.title}
              </h1>

              <div className="flex gap-2 mb-4">
                <Badge variant="outline" className="gap-1">
                  <Tag className="h-3 w-3" />
                  {item.category}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                </Badge>
              </div>

              {item.itemType === 'sell' && item.price ? (
                <div className="mb-6">
                  <p className="text-sm text-muted-foreground mb-1">Price</p>
                  <p className="text-4xl font-bold text-primary" data-testid="text-price">
                    ${parseFloat(item.price).toFixed(2)}
                  </p>
                </div>
              ) : (
                <div className="mb-6">
                  <p className="text-sm text-muted-foreground mb-1">Looking to trade for</p>
                  <p className="text-lg font-semibold" data-testid="text-exchange">
                    {item.expectedExchange}
                  </p>
                </div>
              )}

              {!isOwnItem && (
                <div className="flex gap-3 mb-6">
                  <Button
                    className="flex-1 gap-2"
                    onClick={() => addToCartMutation.mutate()}
                    disabled={addToCartMutation.isPending}
                  >
                    <ShoppingCart className="h-5 w-5" />
                    Add to Cart
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => addToWishlistMutation.mutate()}
                    disabled={addToWishlistMutation.isPending}
                  >
                    <Heart className="h-5 w-5" />
                    Wishlist
                  </Button>
                </div>
              )}
            </div>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {item.user?.name ? getInitials(item.user.name) : <UserIcon className="h-5 w-5" />}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold" data-testid="text-seller-name">{item.user?.name || 'Anonymous'}</p>
                    <p className="text-sm text-muted-foreground">{item.user?.email}</p>
                  </div>
                </div>

                {!isOwnItem && (
                  <div className="space-y-3 pt-4 border-t">
                    <p className="text-sm font-medium">Send a message</p>
                    <Textarea
                      placeholder="Ask about the item..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      className="min-h-[100px]"
                      data-testid="input-message"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!messageText.trim() || sendMessageMutation.isPending}
                      className="w-full gap-2"
                      data-testid="button-send-message"
                    >
                      <Send className="h-4 w-4" />
                      {sendMessageMutation.isPending ? 'Sending...' : 'Send Message'}
                    </Button>
                  </div>
                )}

                {isOwnItem && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground text-center">
                      This is your listing
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {!isOwnItem && messages && messages.length > 0 && (
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold mb-3">Your conversation</h3>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex gap-2 ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`rounded-lg p-3 max-w-[80%] ${msg.senderId === user?.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                            }`}
                          data-testid={`message-${msg.id}`}
                        >
                          <p className="text-sm">{msg.messageText}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
