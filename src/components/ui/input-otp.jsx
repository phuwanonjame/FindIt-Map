import * as React from "react";

export function InputOTP({ value = "", onChange, children, maxLength = 6, ...props }) {
  return <div {...props}><input value={value} maxLength={maxLength} inputMode="numeric" onChange={(event) => onChange?.(event.target.value)} />{children}</div>;
}
export function InputOTPGroup({ children, ...props }) { return <div {...props}>{children}</div>; }
export function InputOTPSlot() { return null; }
