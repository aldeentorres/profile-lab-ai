// Demo print shop: prices, delivery and a local order book. No payment provider is contacted.
export type PrintOption = {id:string;label:string;detail:string;price:number};
export type PrintOrder = {id:string;createdAt:string;agentName:string;agentId?:string;sizeLabel:string;quantity:number;deliveryLabel:string;address:string;methodLabel:string;subtotal:number;deliveryFee:number;total:number;status:"paid"};

export const printSizes:PrintOption[]=[
 {id:"3x2",label:"3 × 2 ft board",detail:"Standard subsale board",price:55},
 {id:"4x3",label:"4 × 3 ft board",detail:"Large frontage board",price:85},
 {id:"6x4",label:"6 × 4 ft board",detail:"Premium roadside board",price:150},
];
export const deliveryOptions:PrintOption[]=[
 {id:"pickup",label:"Collect at IQI office",detail:"Ready in 2 working days",price:0},
 {id:"courier",label:"Courier to site address",detail:"3 – 5 working days",price:15},
];
export const paymentMethods:{id:string;label:string;detail:string}[]=[
 {id:"fpx",label:"Online banking (FPX)",detail:"Maybank2u, CIMB Clicks, RHB Now"},
 {id:"card",label:"Credit or debit card",detail:"Visa, Mastercard"},
 {id:"wallet",label:"E-wallet",detail:"Touch 'n Go, GrabPay"},
];

const storageKey="studio-print-orders";

export function formatMYR(value:number){return `RM ${value.toFixed(2)}`}
export function createOrderId(){return `IQI-PRT-${Math.random().toString(36).slice(2,8).toUpperCase()}`}

// Artwork stays in memory: a 2650 × 1786 PNG would blow past the localStorage quota.
export function recordPrintOrder(order:PrintOrder){try{const book=loadPrintOrders();localStorage.setItem(storageKey,JSON.stringify([order,...book].slice(0,20)))}catch{/* Private mode or a full quota must not block the order. */}return order}
export function loadPrintOrders():PrintOrder[]{try{const raw=localStorage.getItem(storageKey);return raw?JSON.parse(raw) as PrintOrder[]:[]}catch{return[]}}

