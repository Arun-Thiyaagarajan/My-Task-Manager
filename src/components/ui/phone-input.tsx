'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Phone } from 'lucide-react';
import { parsePhoneNumberFromString, CountryCode, getCountries, getCountryCallingCode } from 'libphonenumber-js';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

// Map country codes to emoji flags
const ISO_TO_FLAG: Record<string, string> = {
  AF: '🇦🇫', AX: '🇦🇽', AL: '🇦🇱', DZ: '🇩🇿', AS: '🇦🇸', AD: '🇦🇩', AO: '🇦🇴', AI: '🇦🇮', AQ: '🇦🇶', AG: '🇦🇬', AR: '🇦🇷', AM: '🇦🇲', AW: '🇦🇼', AU: '🇦🇺', AT: '🇦🇹', AZ: '🇦🇿', BS: '🇧🇸', BH: '🇧🇭', BD: '🇧🇩', BB: '🇧🇧', BY: '🇧🇾', BE: '🇧🇪', BZ: '🇧🇿', BJ: '🇧🇯', BM: '🇧🇲', BT: '🇧🇹', BO: '🇧🇴', BQ: '🇧🇶', BA: '🇧🇦', BW: '🇧🇼', BV: '🇧🇻', BR: '🇧🇷', IO: '🇮🇴', BN: '🇧🇳', BG: '🇧🇬', BF: '🇧🇫', BI: '🇧🇮', KH: '🇰🇭', CM: '🇨🇲', CA: '🇨🇦', CV: '🇨🇻', KY: '🇰🇾', CF: '🇨🇫', TD: '🇹🇩', CL: '🇨🇱', CN: '🇨🇳', CX: '🇨🇽', CC: '🇰🇨', CO: '🇨🇴', KM: '🇰🇲', CG: '🇨🇬', CD: '🇨🇩', CK: '🇨🇰', CR: '🇨🇷', CI: '🇨🇮', HR: '🇭🇷', CU: '🇨🇺', CW: '🇨🇼', CY: '🇨🇾', CZ: '🇨🇿', DK: '🇩🇰', DJ: '🇩🇯', DM: '🇩🇲', DO: '🇩🇴', EC: '🇪🇨', EG: '🇪🇬', SV: '🇸🇻', GQ: '🇬🇶', ER: '🇪🇷', EE: '🇪🇪', ET: '🇪🇹', FK: '🇫🇰', FO: '🇫🇴', FJ: '🇫🇯', FI: '🇫🇮', FR: '🇫🇷', GF: '🇬🇫', PF: '🇵🇫', TF: '🇹🇫', GA: '🇬🇦', GM: '🇬🇲', GE: '🇬🇪', DE: '🇩🇪', GH: '🇬🇭', GI: '🇬🇮', GR: '🇬🇷', GL: '🇬🇱', GD: '🇬🇩', GP: '🇬🇵', GU: '🇬🇺', GT: '🇬🇹', GG: '🇬🇬', GN: '🇬🇳', GW: '🇬🇧', GY: '🇬🇾', HT: '🇭🇹', HM: '🇭🇲', VA: '🇻🇦', HN: '🇭🇳', HK: '🇭🇰', HU: '🇭🇺', IS: '🇮🇸', IN: '🇮🇳', ID: '🇮🇩', IR: '🇮🇷', IQ: '🇮🇶', IE: '🇮🇪', IM: '🇮🇲', IL: '🇮🇱', IT: '🇮🇹', JM: '🇯🇲', JP: '🇯🇵', JE: '🇯🇪', JO: '🇯🇴', KZ: '🇰🇿', KE: '🇰🇪', KI: '🇰🇮', KP: '🇰🇵', KR: '🇰🇷', KW: '🇰🇼', KG: '🇰🇬', LA: '🇱🇦', LV: '🇱🇻', LB: '🇱🇧', LS: '🇱🇸', LR: '🇱🇷', LY: '🇱🇾', LI: '🇱🇮', LT: '🇱🇹', LU: '🇱🇺', MO: '🇲🇴', MK: '🇲🇰', MG: '🇲🇬', MW: '🇲🇼', MY: '🇲🇾', MV: '🇲🇻', ML: '🇲🇱', MT: '🇲🇹', MH: '🇲🇭', MQ: '🇲🇶', MR: '🇲🇷', MU: '🇲🇺', YT: '🇾🇹', MX: '🇲🇽', FM: '🇫🇲', MD: '🇲🇩', MC: '🇲🇨', MN: '🇲🇳', ME: '🇲🇪', MS: '🇲🇸', MA: '🇲🇦', MZ: '🇲🇿', MM: '🇲🇲', NA: '🇳🇦', NR: '🇳🇷', NP: '🇳🇵', NL: '🇳🇱', NC: '🇳🇨', NZ: '🇳🇿', NI: '🇳🇮', NE: '🇳🇪', NG: '🇳🇬', NU: '🇳🇺', NF: '🇳🇫', MP: '🇲🇵', NO: '🇳🇴', OM: '🇴🇲', PK: '🇵🇰', PW: '🇵🇼', PS: '🇵🇸', PA: '🇵🇦', PG: '🇵🇬', PY: '🇵🇾', PE: '🇵🇪', PH: '🇵🇭', PN: '🇵🇳', PL: '🇵🇱', PT: '🇵🇹', PR: '🇵🇷', QA: '🇶🇦', RE: '🇷🇪', RO: '🇷🇴', RU: '🇷🇺', RW: '🇷🇼', BL: '🇧🇱', SH: '🇸🇭', KN: '🇰🇳', LC: '🇱🇨', MF: '🇲🇫', PM: '🇵🇲', VC: '🇻🇨', WS: '🇼🇸', SM: '🇸🇲', ST: '🇸🇹', SA: '🇸🇦', SN: '🇸🇳', RS: '🇷🇸', SC: '🇸🇨', SL: '🇸🇱', SG: '🇸🇬', SX: '🇸🇽', SK: '🇸🇰', SI: '🇸🇮', SB: '🇸🇧', SO: '🇸🇴', ZA: '🇿🇦', GS: '🇬🇸', SS: '🇸🇸', ES: '🇪🇸', LK: '🇱🇰', SD: '🇸🇩', SR: '🇸🇷', SJ: '🇸🇯', SZ: '🇸🇿', SE: '🇸🇪', CH: '🇨🇭', SY: '🇸🇾', TW: '🇹🇼', TJ: '🇹🇯', TZ: '🇹🇿', TH: '🇹🇭', TL: '🇹🇱', TG: '🇹🇬', TK: '🇹🇰', TO: '🇹🇴', TT: '🇹🇹', TN: '🇹🇳', TR: '🇹🇷', TM: '🇹🇲', TC: '🇹🇨', TV: '🇹🇻', UG: '🇺🇬', UA: '🇺🇦', AE: '🇦🇪', GB: '🇬🇧', US: '🇺🇸', UM: '🇺🇲', UY: '🇺🇾', UZ: '🇺🇿', VU: '🇻🇺', VE: '🇻🇪', VN: '🇻🇳', VG: '🇻🇬', VI: '🇻🇮', WF: '🇼🇫', EH: '🇪🇭', YE: '🇾🇪', ZM: '🇿🇲', ZW: '🇿🇼',
};

export function PhoneInput({ value, onChange, placeholder, disabled, className }: PhoneInputProps) {
  const [open, setOpen] = React.useState(false);
  const [country, setCountry] = React.useState<CountryCode>('US');

  // Try to determine the country from the existing value on initial load
  React.useEffect(() => {
    if (value) {
      const phoneNumber = parsePhoneNumberFromString(value);
      if (phoneNumber?.country) {
        setCountry(phoneNumber.country);
      }
    }
  }, []);

  const handleCountryChange = (newCountry: CountryCode) => {
    setCountry(newCountry);
    const dialCode = `+${getCountryCallingCode(newCountry)}`;
    
    // If the value was empty or just a dial code, update it to the new dial code
    if (!value || value.startsWith('+')) {
        // Keep the national part if it exists
        const phoneNumber = parsePhoneNumberFromString(value);
        if (phoneNumber) {
            const newValue = `+${getCountryCallingCode(newCountry)}${phoneNumber.nationalNumber}`;
            onChange(newValue);
        } else {
            onChange(dialCode);
        }
    }
    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value;
    
    // Always ensure it starts with +
    if (!input.startsWith('+')) {
        input = '+' + input.replace(/\D/g, '');
    }

    const phoneNumber = parsePhoneNumberFromString(input);
    if (phoneNumber) {
      onChange(phoneNumber.format('E.164'));
      if (phoneNumber.country && phoneNumber.country !== country) {
        setCountry(phoneNumber.country);
      }
    } else {
      onChange(input);
    }
  };

  const formattedDisplay = React.useMemo(() => {
    const phoneNumber = parsePhoneNumberFromString(value);
    return phoneNumber ? phoneNumber.formatInternational() : value;
  }, [value]);

  const countryList = React.useMemo(() => {
    return getCountries().map((c) => ({
      code: c,
      name: new Intl.DisplayNames(['en'], { type: 'region' }).of(c) || c,
      dial: `+${getCountryCallingCode(c)}`,
      flag: ISO_TO_FLAG[c] || '🏳️',
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  return (
    <div className={cn('flex gap-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[100px] h-11 px-3 justify-between shrink-0"
            disabled={disabled}
          >
            <span className="flex items-center gap-2 overflow-hidden">
              <span className="text-lg">{ISO_TO_FLAG[country] || '🏳️'}</span>
              <span className="text-sm font-medium">+{getCountryCallingCode(country)}</span>
            </span>
            <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search country..." />
            <CommandList>
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandGroup>
                {countryList.map((c) => (
                  <CommandItem
                    key={c.code}
                    value={`${c.name} ${c.dial}`}
                    onSelect={() => handleCountryChange(c.code as CountryCode)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        country === c.code ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className="mr-2 text-lg">{c.flag}</span>
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="ml-2 text-muted-foreground font-mono text-xs">{c.dial}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      <div className="relative flex-1 group">
        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
        <Input
          type="tel"
          placeholder={placeholder || 'Phone number'}
          value={formattedDisplay}
          onChange={handleInputChange}
          disabled={disabled}
          className="pl-10 h-11"
        />
      </div>
    </div>
  );
}
