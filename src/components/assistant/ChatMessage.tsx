import { Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  isLoading?: boolean;
}

export function ChatMessage({ role, content, isLoading }: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div className={cn(
      "flex gap-3 p-4",
      isUser ? "flex-row-reverse" : "flex-row"
    )}>
      {/* Avatar */}
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
        isUser 
          ? "bg-primary/20 text-primary" 
          : "bg-gradient-to-br from-success/30 to-success/10 text-success border border-success/20"
      )}>
        {isUser ? (
          <User className="w-4 h-4" />
        ) : (
          <Bot className="w-4 h-4" />
        )}
      </div>

      {/* Message Bubble */}
      <div className={cn(
        "flex-1 max-w-[85%] rounded-2xl px-4 py-3",
        isUser 
          ? "bg-primary text-primary-foreground rounded-tr-md" 
          : "bg-muted/50 text-foreground rounded-tl-md border border-border/50"
      )}>
        {isLoading && !content ? (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        ) : (
          <div className="text-sm whitespace-pre-wrap leading-relaxed">
            {content}
          </div>
        )}
      </div>
    </div>
  );
}
