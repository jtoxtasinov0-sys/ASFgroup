import { money } from '../lib/format';

/** "Sikitka" — narx yorlig'i */
export default function PriceTag({ value, currency = "so'm", big = false, sale = false }) {
  return (
    <span className={`pricetag${big ? ' big' : ''}${sale ? ' sale' : ''}`}>
      <b>{money(value)}</b>
      <i>{currency}</i>
    </span>
  );
}

export function OldPrice({ value, currency = "so'm" }) {
  return (
    <span className="pricetag old">
      <b>{money(value)}</b> <i>{currency}</i>
    </span>
  );
}
