import { Link } from 'wouter';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Item, User } from '@shared/schema';

interface ItemCardProps {
  item: Item & { user?: User };
}

export function ItemCard({ item }: ItemCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Link href={`/items/${item.id}`} data-testid={`card-item-${item.id}`}>
      <div>
        <Card className="overflow-hidden hover-elevate active-elevate-2 cursor-pointer h-full flex flex-col">
          <div className="relative aspect-[4/3] overflow-hidden bg-muted">
            <img
              src={item.imageUrl}
              alt={item.title}
              className="object-cover w-full h-full"
              loading="lazy"
            />
            <Badge 
              className="absolute top-3 right-3"
              variant={item.itemType === 'barter' ? 'default' : 'secondary'}
              data-testid={`badge-type-${item.id}`}
            >
              {item.itemType === 'barter' ? 'Barter' : 'For Sale'}
            </Badge>
          </div>
          
          <div className="p-4 flex flex-col gap-2 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-lg line-clamp-2 flex-1" data-testid={`text-title-${item.id}`}>
                {item.title}
              </h3>
            </div>
            
            <Badge variant="outline" className="w-fit text-xs">
              {item.category}
            </Badge>

            <div className="mt-auto pt-2">
              {item.itemType === 'sell' && item.price ? (
                <p className="text-2xl font-bold text-primary" data-testid={`text-price-${item.id}`}>
                  ${parseFloat(item.price).toFixed(2)}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground" data-testid={`text-exchange-${item.id}`}>
                  Looking for: {item.expectedExchange}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t mt-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs bg-secondary">
                  {item.user?.name ? getInitials(item.user.name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">
                {item.user?.name || 'Anonymous'}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </Link>
  );
}
