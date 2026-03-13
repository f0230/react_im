import React from 'react';

const AspectRatio = React.forwardRef(({ ratio = 1, className = '', style, children, ...props }, ref) => (
  <div
    ref={ref}
    className={className}
    style={{ aspectRatio: String(ratio), ...style }}
    {...props}
  >
    {children}
  </div>
));

AspectRatio.displayName = 'AspectRatio';

export { AspectRatio };
