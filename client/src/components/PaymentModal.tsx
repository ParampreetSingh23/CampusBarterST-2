
import { useState } from 'react';
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
 DialogDescription,
 DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CreditCard, Lock } from 'lucide-react';

interface PaymentModalProps {
 isOpen: boolean;
 onClose: () => void;
 onConfirm: () => void;
 isLoading: boolean;
 totalAmount: number;
}

export function PaymentModal({ isOpen, onClose, onConfirm, isLoading, totalAmount }: PaymentModalProps) {
 const [cardNumber, setCardNumber] = useState('');
 const [expiry, setExpiry] = useState('');
 const [cvc, setCvc] = useState('');
 const [name, setName] = useState('');

 const isValid = cardNumber.length > 0 && expiry.length > 0 && cvc.length > 0 && name.length > 0;

 const handleConfirm = () => {
  if (isValid) {
   onConfirm();
  }
 };

 return (
  <Dialog open={isOpen} onOpenChange={onClose}>
   <DialogContent className="sm:max-w-[425px]">
    <DialogHeader>
     <DialogTitle>Secure Checkout</DialogTitle>
     <DialogDescription>
      Enter your payment details to complete the purchase of ${totalAmount.toFixed(2)}.
     </DialogDescription>
    </DialogHeader>
    <div className="grid gap-4 py-4">
     <div className="grid gap-2">
      <Label htmlFor="name">Cardholder Name</Label>
      <Input
       id="name"
       placeholder="John Doe"
       value={name}
       onChange={(e) => setName(e.target.value)}
      />
     </div>
     <div className="grid gap-2">
      <Label htmlFor="number">Card Number</Label>
      <div className="relative">
       <CreditCard className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
       <Input
        id="number"
        placeholder="0000 0000 0000 0000"
        className="pl-9"
        value={cardNumber}
        onChange={(e) => setCardNumber(e.target.value)}
       />
      </div>
     </div>
     <div className="grid grid-cols-2 gap-4">
      <div className="grid gap-2">
       <Label htmlFor="expiry">Expiry Date</Label>
       <Input
        id="expiry"
        placeholder="MM/YY"
        value={expiry}
        onChange={(e) => setExpiry(e.target.value)}
       />
      </div>
      <div className="grid gap-2">
       <Label htmlFor="cvc">CVC</Label>
       <div className="relative">
        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
         id="cvc"
         placeholder="123"
         className="pl-9"
         value={cvc}
         onChange={(e) => setCvc(e.target.value)}
         type="password"
         maxLength={3}
        />
       </div>
      </div>
     </div>
    </div>
    <DialogFooter>
     <Button variant="outline" onClick={onClose} disabled={isLoading}>
      Cancel
     </Button>
     <Button onClick={handleConfirm} disabled={!isValid || isLoading}>
      {isLoading ? 'Processing...' : `Pay $${totalAmount.toFixed(2)}`}
     </Button>
    </DialogFooter>
   </DialogContent>
  </Dialog>
 );
}
