import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Navbar } from '@/components/Navbar';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Send, MessageSquare, User as UserIcon } from 'lucide-react';
import { Message, User, Item } from '@shared/schema';
import { formatDistanceToNow } from 'date-fns';

type ConversationGroup = {
  itemId: string;
  item: Item;
  otherUser: User;
  messages: (Message & { sender: User })[];
  lastMessage: Message;
};

export default function Messages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');

  const { data: allMessages, isLoading } = useQuery<(Message & { sender: User; receiver: User; item: Item })[]>({
    queryKey: ['/api/messages'],
  });

  const conversations: ConversationGroup[] = [];
  if (allMessages) {
    const grouped = new Map<string, (Message & { sender: User; receiver: User; item: Item })[]>();
    
    allMessages.forEach(msg => {
      const key = `${msg.itemId}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(msg);
    });

    grouped.forEach((msgs, itemId) => {
      const sortedMsgs = msgs.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
      const lastMsg = sortedMsgs[sortedMsgs.length - 1];
      const otherUser = lastMsg.senderId === user?.id ? lastMsg.receiver : lastMsg.sender;
      
      conversations.push({
        itemId,
        item: lastMsg.item,
        otherUser,
        messages: sortedMsgs,
        lastMessage: lastMsg,
      });
    });
  }

  const currentConversation = conversations.find(c => c.itemId === selectedConversation);

  const sendMessageMutation = useMutation({
    mutationFn: async (text: string) => {
      if (!currentConversation) return;
      const res = await apiRequest('POST', '/api/messages', {
        itemId: currentConversation.itemId,
        receiverId: currentConversation.otherUser.id,
        messageText: text,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      setMessageText('');
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container mx-auto px-6 py-8 max-w-7xl">
        <h1 className="font-heading text-4xl font-bold mb-6" data-testid="text-page-title">
          Messages
        </h1>

        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-[600px]" />
            <Skeleton className="h-[600px] lg:col-span-2" />
          </div>
        ) : conversations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-20">
              <div className="rounded-full bg-muted p-6 mb-4">
                <MessageSquare className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="font-heading text-2xl font-semibold mb-2">No messages yet</h3>
              <p className="text-muted-foreground text-center max-w-sm">
                Start a conversation by messaging item owners on the marketplace
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardContent className="p-0">
                <ScrollArea className="h-[600px]">
                  <div className="divide-y">
                    {conversations.map((conv) => (
                      <button
                        key={conv.itemId}
                        onClick={() => setSelectedConversation(conv.itemId)}
                        className={`w-full p-4 text-left hover-elevate active-elevate-2 ${
                          selectedConversation === conv.itemId ? 'bg-muted' : ''
                        }`}
                        data-testid={`conversation-${conv.itemId}`}
                      >
                        <div className="flex gap-3">
                          <Avatar className="h-12 w-12 flex-shrink-0">
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {getInitials(conv.otherUser.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-semibold truncate">{conv.otherUser.name}</p>
                              <span className="text-xs text-muted-foreground flex-shrink-0">
                                {formatDistanceToNow(new Date(conv.lastMessage.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{conv.item.title}</p>
                            <p className="text-sm truncate mt-1">
                              {conv.lastMessage.messageText}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              {currentConversation ? (
                <CardContent className="p-0 flex flex-col h-[600px]">
                  <div className="p-4 border-b">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getInitials(currentConversation.otherUser.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold" data-testid="text-conversation-user">
                          {currentConversation.otherUser.name}
                        </p>
                        <p className="text-sm text-muted-foreground" data-testid="text-conversation-item">
                          Re: {currentConversation.item.title}
                        </p>
                      </div>
                    </div>
                  </div>

                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                      {currentConversation.messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={`flex gap-2 ${
                            msg.senderId === user?.id ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <div
                            className={`rounded-lg p-3 max-w-[70%] ${
                              msg.senderId === user?.id
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
                  </ScrollArea>

                  <div className="p-4 border-t">
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Type your message..."
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        className="min-h-[60px]"
                        data-testid="input-message"
                      />
                      <Button
                        onClick={handleSendMessage}
                        disabled={!messageText.trim() || sendMessageMutation.isPending}
                        size="icon"
                        className="h-[60px] w-[60px]"
                        data-testid="button-send"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              ) : (
                <CardContent className="flex items-center justify-center h-[600px]">
                  <div className="text-center text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a conversation to view messages</p>
                  </div>
                </CardContent>
              )}
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
