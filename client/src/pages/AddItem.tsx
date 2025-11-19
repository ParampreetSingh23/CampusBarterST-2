import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Navbar } from '@/components/Navbar';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { ArrowLeft } from 'lucide-react';

const CATEGORIES = ['Books', 'Electronics', 'Furniture', 'Clothing', 'Sports', 'Other'];

const itemSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  category: z.string().min(1, 'Please select a category'),
  imageUrl: z.string().url('Please enter a valid image URL'),
  itemType: z.enum(['barter', 'sell']),
  expectedExchange: z.string().optional(),
  price: z.string().optional(),
}).refine((data) => {
  if (data.itemType === 'barter') {
    return !!data.expectedExchange && data.expectedExchange.length > 0;
  }
  return true;
}, {
  message: 'Expected exchange is required for barter items',
  path: ['expectedExchange'],
}).refine((data) => {
  if (data.itemType === 'sell') {
    return !!data.price && parseFloat(data.price) > 0;
  }
  return true;
}, {
  message: 'Price is required for items for sale',
  path: ['price'],
});

type ItemFormValues = z.infer<typeof itemSchema>;

export default function AddItem() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      title: '',
      description: '',
      category: '',
      imageUrl: '',
      itemType: 'sell',
      expectedExchange: '',
      price: '',
    },
  });

  const itemType = form.watch('itemType');

  const createItemMutation = useMutation({
    mutationFn: async (data: ItemFormValues) => {
      const itemData = {
        title: data.title,
        description: data.description,
        category: data.category,
        imageUrl: data.imageUrl,
        itemType: data.itemType,
        price: data.itemType === 'sell' ? data.price : null,
        expectedExchange: data.itemType === 'barter' ? data.expectedExchange : null,
      };
      const res = await apiRequest('POST', '/api/items', itemData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/items'] });
      toast({
        title: 'Item posted!',
        description: 'Your item has been added to the marketplace.',
      });
      setLocation('/dashboard');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to post item. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: ItemFormValues) => {
    createItemMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-6 py-8 max-w-3xl">
        <Button 
          variant="ghost" 
          className="mb-6 -ml-3"
          onClick={() => setLocation('/dashboard')}
          data-testid="button-back"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-3xl">Post a New Item</CardTitle>
            <CardDescription>Share an item you want to sell or barter with fellow students</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Title</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Calculus Textbook 5th Edition" 
                          data-testid="input-title"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe your item, its condition, and any important details..." 
                          className="min-h-[120px]"
                          data-testid="input-description"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-category">
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CATEGORIES.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="imageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Image URL</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://example.com/image.jpg" 
                            data-testid="input-image-url"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="itemType"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          {field.value === 'barter' ? 'Barter Item' : 'Sell Item'}
                        </FormLabel>
                        <FormDescription>
                          {field.value === 'barter' 
                            ? 'Looking to trade for another item' 
                            : 'Selling for a fixed price'
                          }
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value === 'barter'}
                          onCheckedChange={(checked) => field.onChange(checked ? 'barter' : 'sell')}
                          data-testid="switch-item-type"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {itemType === 'sell' ? (
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price ($)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            placeholder="29.99" 
                            data-testid="input-price"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>Enter the selling price in dollars</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <FormField
                    control={form.control}
                    name="expectedExchange"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Looking to trade for</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Biology textbook, Laptop charger" 
                            data-testid="input-expected-exchange"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>What would you like in exchange?</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="flex gap-4 pt-4">
                  <Button 
                    type="submit" 
                    className="flex-1"
                    disabled={createItemMutation.isPending}
                    data-testid="button-submit"
                  >
                    {createItemMutation.isPending ? 'Posting...' : 'Post Item'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => setLocation('/dashboard')}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
