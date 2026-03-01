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
import { ArrowLeft, Wand2, Loader2, Sparkles } from 'lucide-react';
import { useState } from 'react';

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
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [isEstimating, setIsEstimating] = useState(false);

  const handleEstimateValue = async () => {
    const title = form.getValues('title');
    const description = form.getValues('description');
    const category = form.getValues('category');

    if (!title) {
      toast({
        title: "Title Required",
        description: "Please enter an item title first so the AI knows what to estimate.",
        variant: "destructive",
      });
      return;
    }

    setIsEstimating(true);
    try {
      const res = await apiRequest('POST', '/api/items/estimate-value', {
        title,
        description,
        category
      });

      if (!res.ok) {
        if (res.status === 503) {
          throw new Error("AI features are currently unavailable (Missing API Key).");
        }
        throw new Error("Failed to estimate value");
      }

      const data = await res.json();
      console.log("AI Estimate Value response data:", data);
      form.setValue('expectedExchange', data.expectedExchange, { shouldValidate: true });

      toast({
        title: "Estimation Complete",
        description: "AI suggested fair trades successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to estimate value. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsEstimating(false);
    }
  };

  const handleGenerateDescription = async () => {
    const title = form.getValues('title');
    const category = form.getValues('category');
    const expectedExchange = form.getValues('expectedExchange');
    const currentItemType = form.getValues('itemType');

    if (!title) {
      toast({
        title: "Title Required",
        description: "Please enter an item title first so the AI knows what to describe.",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingDesc(true);
    try {
      const res = await apiRequest('POST', '/api/items/generate-description', {
        title,
        category,
        expectedExchange,
        itemType: currentItemType
      });

      if (!res.ok) {
        if (res.status === 503) {
          throw new Error("AI features are currently unavailable (Missing API Key). Please ask the administrator to configure it.");
        }
        throw new Error("Failed to generate description");
      }

      const data = await res.json();
      form.setValue('description', data.description, { shouldValidate: true });

      toast({
        title: "Description Generated",
        description: "AI description generated successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate description. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingDesc(false);
    }
  };

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
                      <div className="flex items-center justify-between">
                        <FormLabel>Description</FormLabel>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={handleGenerateDescription}
                          disabled={isGeneratingDesc || !form.watch('title')}
                          className="h-8 text-xs font-medium"
                        >
                          {isGeneratingDesc ? (
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                          ) : (
                            <Wand2 className="mr-2 h-3 w-3 text-primary" />
                          )}
                          Make with AI
                        </Button>
                      </div>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your item, its condition, and any important details... or use AI to generate one!"
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
                        <div className="flex items-center justify-between">
                          <FormLabel>Looking to trade for</FormLabel>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={handleEstimateValue}
                            disabled={isEstimating || !form.watch('title')}
                            className="h-8 text-xs font-medium"
                          >
                            {isEstimating ? (
                              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            ) : (
                              <Sparkles className="mr-2 h-3 w-3 text-primary" />
                            )}
                            Estimate Fair Trade
                          </Button>
                        </div>
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
