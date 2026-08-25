export type TrackedOrder = { id:string; phone:string; paymentReference:string; amount:number; status:'PENDING_PAYMENT'|'PAYMENT_CONFIRMED'|'PROCESSING'|'COMPLETED'|'FAILED'; timeline:{label:string; detail:string; at:string}[] };
const globalState = globalThis as unknown as { digimartOrders?: Map<string,TrackedOrder> };
const orders = globalState.digimartOrders ?? new Map<string,TrackedOrder>();
globalState.digimartOrders = orders;
export function createTrackedOrder(order: TrackedOrder) { orders.set(order.id,order); return order; }
export function findTrackedOrder(orderId:string,phone:string) { const order=orders.get(orderId); return order?.phone === phone ? order : null; }
export function updatePayment(reference:string, success:boolean) { const order=[...orders.values()].find(o=>o.paymentReference===reference); if (!order) return null; order.status=success?'PAYMENT_CONFIRMED':'FAILED'; order.timeline.push({label:success?'Payment confirmed':'Payment failed',detail:success?'We received verified payment confirmation. Fulfilment will now begin.':'The payment was not confirmed. No fulfilment has started.',at:new Date().toISOString()}); if(success){order.status='PROCESSING';order.timeline.push({label:'Processing order',detail:'DigiMart is routing each order item to the right provider or seller.',at:new Date().toISOString()})} return order; }
