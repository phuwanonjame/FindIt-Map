import * as React from "react";

export const Input = React.forwardRef(function Input({ className = "", ...props }, ref) {
  return <input ref={ref} className={className} {...props} />;
});
