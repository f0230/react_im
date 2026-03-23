import * as React from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageLoading } from "@/components/ui/message-loading";

function ChatBubble({
  variant = "received",
  layout = "default",
  className,
  children,
  ...props
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 mb-4",
        layout === "ai" && "items-start",
        variant === "sent" && "flex-row-reverse",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

const ChatBubbleMessage = React.forwardRef(({
  variant = "received",
  isLoading,
  className,
  children,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-lg p-3",
        variant === "sent" ? "bg-primary text-primary-foreground" : "bg-muted",
        className,
      )}
      {...props}
    >
      {isLoading ? (
        <div className="flex items-center space-x-2">
          <MessageLoading />
        </div>
      ) : (
        children
      )}
    </div>
  );
});
ChatBubbleMessage.displayName = "ChatBubbleMessage";

function ChatBubbleAvatar({
  src,
  fallback = "AI",
  className,
  ...props
}) {
  return (
    <Avatar className={cn("h-8 w-8", className)} {...props}>
      {src ? <AvatarImage src={src} alt={fallback} /> : null}
      <AvatarFallback>{fallback}</AvatarFallback>
    </Avatar>
  );
}

function ChatBubbleAction({
  icon,
  onClick,
  className,
  ...props
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-6 w-6 rounded-md", className)}
      onClick={onClick}
      {...props}
    >
      {icon}
    </Button>
  );
}

function ChatBubbleActionWrapper({ className, children, ...props }) {
  return (
    <div className={cn("flex items-center gap-1 mt-2", className)} {...props}>
      {children}
    </div>
  );
}

export {
  ChatBubble,
  ChatBubbleAction,
  ChatBubbleActionWrapper,
  ChatBubbleAvatar,
  ChatBubbleMessage,
};
