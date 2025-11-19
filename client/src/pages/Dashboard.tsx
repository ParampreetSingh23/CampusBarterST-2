import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navbar } from '@/components/Navbar';
import { ItemCard } from '@/components/ItemCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Package, TrendingUp } from 'lucide-react';
import { Item, User } from '@shared/schema';

const CATEGORIES = ['All', 'Books', 'Electronics', 'Furniture', 'Clothing', 'Sports', 'Other'];

export default function Dashboard() {
  const [filterType, setFilterType] = useState<'all' | 'barter' | 'sell'>('all');
  const [category, setCategory] = useState('All');

  const { data: items, isLoading } = useQuery<(Item & { user: User })[]>({
    queryKey: ['/api/items'],
  });

  const filteredItems = items?.filter((item) => {
    const typeMatch = filterType === 'all' || item.itemType === filterType;
    const categoryMatch = category === 'All' || item.category === category;
    return typeMatch && categoryMatch;
  }) || [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="mb-8">
          <h1 className="font-heading text-4xl font-bold mb-2" data-testid="text-page-title">
            Discover Items
          </h1>
          <p className="text-muted-foreground">Browse items from students on campus</p>
        </div>

        <div className="mb-8 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filterType === 'all' ? 'default' : 'outline'}
              onClick={() => setFilterType('all')}
              data-testid="button-filter-all"
            >
              All Items
            </Button>
            <Button
              variant={filterType === 'barter' ? 'default' : 'outline'}
              onClick={() => setFilterType('barter')}
              data-testid="button-filter-barter"
            >
              For Barter
            </Button>
            <Button
              variant={filterType === 'sell' ? 'default' : 'outline'}
              onClick={() => setFilterType('sell')}
              data-testid="button-filter-sell"
            >
              For Sale
            </Button>
          </div>

          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[180px]" data-testid="select-category">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-[240px] w-full rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="rounded-full bg-muted p-6 mb-4">
              <Package className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="font-heading text-2xl font-semibold mb-2">No items found</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              {filterType === 'all' 
                ? "Be the first to post an item on the marketplace!"
                : `No items available for ${filterType === 'barter' ? 'barter' : 'sale'} in this category.`
              }
            </p>
            <Button onClick={() => {
              setFilterType('all');
              setCategory('All');
            }} data-testid="button-clear-filters">
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        )}

        {filteredItems.length > 0 && (
          <div className="mt-12 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span>Showing {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}</span>
          </div>
        )}
      </main>
    </div>
  );
}
