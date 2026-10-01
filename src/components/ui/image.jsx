import * as React from "react";

export const Image = React.forwardRef(function Image({ className = "", alt = "", ...props }, ref) {
  return <img ref={ref} className={className} alt={alt} {...props} />;
});
