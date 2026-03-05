import { loadConfig } from '../../lib/config.ts';

export interface CategoryResult {
  category: string;
  needsReview: boolean;
}

export const DEFAULT_EXACT_MATCHES: Record<string, string> = {
  // Gym/fitness
  'HONE FITNESS': 'Gym/fitness',

  // Transit
  'PRESTO FARE': 'Transit',

  // Just a little treat
  'TIM HORTONS': 'Just a little treat',
  "ED'S REAL SCOOP": 'Just a little treat',
  'SQ *PILOT COFFEE QUEEN ST': 'Just a little treat',
  'SQ *BOXCAR SOCIAL': 'Just a little treat',
  'BOXCAR SOCIAL': 'Just a little treat',

  // Groceries
  'THE SOURCE BULK FOODS': 'Groceries',
  'SHOPPERS DRUG MART': 'Groceries',
  'RAISE THE ROOT ORGANIC MA': 'Groceries',
  'FRESHCO': 'Groceries',
  'FARM BOY': 'Groceries',

  // Gas
  'PIONEER': 'Gas',

  // Insurance
  'CO-OP LIFE/VIE': 'Insurance',
  'COOPERATORS CSI': 'Insurance',

  // Internet
  'BELL CANADA': 'Internet',

  // Mortgage
  'TD BANK': 'Mortgage',

  // News
  'THE GLOBE AND MAIL INC': 'News',
  'THE NEW YORK TIMES': 'News',

  // Other Household
  'CANADIAN TIRE': 'Other Household',

  // Hobbies
  'Queen Books': 'Hobbies',

  // Home furnishings
  'SQ *JONATHAN SAU PHOTOGRA': 'Home furnishings',

  // Gifts
  'BEST BUY': 'Gifts',
  'TICKETMASTER CANADA HOST': 'Gifts',
  'CHERRY ST BBQ': 'Gifts',

  // Clothing
  'Uniqlo Co.': 'Clothing',

  // Family support
  'Pre-authorized Debit to Trent U': 'Family support',

  // Donations
  'CANADAHELPS': 'Recurring donation',
  'COVENANT HOUSE TO': 'One-time donation',

  // Entertainment
  'ETSY CANADA LIMITED TORONTO': 'Entertainment',
  'CINEPLEX': 'Entertainment',
  'TBJ CONCESSIONS': 'Entertainment',

  // Restaurants/takeout
  "MCDONALD'S": 'Restaurants/takeout',
  'REYES FARMS': 'Restaurants/takeout',
  'UBER CANADA/UBEREATS': 'Restaurants/takeout',

  // Subscriptions
  'NAME-CHEAP.COM': 'Subscriptions',
  'PATREON* MEMBERSHIP': 'Subscriptions',
  'Patreon* Membership': 'Subscriptions',
  'GOOGLE *YOUTUBEPREMIUM': 'Subscriptions',
  'GOOGLE *YouTubePremium': 'Subscriptions',
  'APPLE.COM/BILL': 'Subscriptions',
  'CLAUDE.AI SUBSCRIPTION': 'Subscriptions',

  // Other essentials
  'MAXSOLD INCORPORATED': 'Other essentials',

  // Cats
  'ROVER.COM* PET SVCS.': 'Cats',

  // Home furnishings
  'WAYFAIR': 'Home furnishings',

  // Parking permit
  'PARKING PERMIT-PERM': 'Parking permit',

  // Travel
  'THE BROADVIEW HOTEL': 'Travel',

  // Additional mappings from Amex data
  'GAP.com': 'Clothing',
  'FONS-ELITEMUSICACADEMY': 'Hobbies',
  'MIDJOURNEY INC. SOUTH SAN FRANC': 'Subscriptions',
  'CUSTOMAT.CA MATBOARDS': 'Hobbies',
  'MOLSOVAN HAND PULLED NO': 'Restaurants/takeout',
  'THE SECOND CITY TORONTO': 'Entertainment',
};

export const DEFAULT_KEYWORD_PATTERNS: Record<string, string[]> = {
  // Transit
  'Transit': ['PRESTO', 'TTC', 'GO TRANSIT', 'TRANSIT', 'UBER', 'LYFT'],

  // Just a little treat
  'Just a little treat': [
    'COFFEE',
    'STARBUCKS',
    'TIM HORTONS',
    'CAFE',
    'DONUT',
    'BOXCAR',
  ],

  // Groceries
  'Groceries': [
    'LOBLAWS',
    'METRO',
    'SOBEYS',
    'WALMART',
    'COSTCO',
    'FARMBOY',
    'FARM BOY',
  ],

  // Gas
  'Gas': ['PETRO', 'SHELL', 'ESSO', 'PIONEER', 'CHEVRON'],

  // Restaurants/takeout
  'Restaurants/takeout': [
    'RESTAURANT',
    'MCDONALD',
    'BURGER',
    'PIZZA',
    'SUSHI',
    'CHINESE',
    'UBER',
    'UBEREATS',
  ],

  // Amazon - default to Other Household but flag for review
  'Other Household': ['AMZN', 'AMAZON'],

  // Insurance
  'Insurance': ['INSURANCE', 'ALLSTATE', 'STATE FARM'],

  // Phone/Internet
  'Phone': ['ROGERS', 'BELL', 'TELUS', 'FIDO'],
  'Internet': ['ROGERS', 'BELL', 'TELUS'],

  // Banking
  'Banking fees': ['BANK FEE', 'NSF', 'OVERDRAFT'],

  // Entertainment
  'Entertainment': [
    'CINEMA',
    'MOVIE',
    'THEATRE',
    'CINEPLEX',
    'TBJ CONCESSIONS',
  ],

  // Gym/fitness
  'Gym/fitness': ['GYM', 'FITNESS', 'YOGA', 'SPIN'],

  // Clothing
  'Clothing': ['GAP', 'H&M', 'ZARA', 'UNIQLO'],

  // Home furnishings
  'Home furnishings': ['IKEA', 'WAYFAIR', 'HOME DEPOT', 'CANADIAN TIRE'],

  // Subscriptions
  'Subscriptions': [
    'NETFLIX',
    'SPOTIFY',
    'ADOBE',
    'MICROSOFT',
    'PATREON',
    'YOUTUBE',
    'APPLE.COM',
  ],
};

interface BudgetConfig {
  exactMatches?: Record<string, string>;
  keywordPatterns?: Record<string, string[]>;
}

interface CategorizerOptions {
  exactMatches?: Record<string, string>;
  keywordPatterns?: Record<string, string[]>;
}

export class MerchantCategorizer {
  private exactMatches: Record<string, string>;
  private keywordPatterns: Record<string, string[]>;

  constructor(options?: CategorizerOptions) {
    this.exactMatches = { ...DEFAULT_EXACT_MATCHES, ...options?.exactMatches };
    this.keywordPatterns = { ...DEFAULT_KEYWORD_PATTERNS };
    if (options?.keywordPatterns) {
      for (
        const [category, keywords] of Object.entries(options.keywordPatterns)
      ) {
        if (this.keywordPatterns[category]) {
          const merged = new Set([
            ...this.keywordPatterns[category],
            ...keywords,
          ]);
          this.keywordPatterns[category] = [...merged];
        } else {
          this.keywordPatterns[category] = keywords;
        }
      }
    }
  }

  static async create(): Promise<MerchantCategorizer> {
    const config = await loadConfig<BudgetConfig>('budget.json');
    return new MerchantCategorizer({
      exactMatches: config?.exactMatches,
      keywordPatterns: config?.keywordPatterns,
    });
  }

  categorize(description: string): CategoryResult {
    const descriptionUpper = description.toUpperCase();

    // First try exact matches
    for (const [merchant, category] of Object.entries(this.exactMatches)) {
      if (descriptionUpper.includes(merchant.toUpperCase())) {
        return { category, needsReview: false };
      }
    }

    // Then try keyword patterns
    for (const [category, keywords] of Object.entries(this.keywordPatterns)) {
      for (const keyword of keywords) {
        if (descriptionUpper.includes(keyword)) {
          // Amazon transactions need review since they could be anything
          const needsReview = descriptionUpper.includes('AMZN') ||
            descriptionUpper.includes('AMAZON');
          return { category, needsReview };
        }
      }
    }

    // If no match found, make a best guess based on common patterns
    if (
      ['PAYMENT RECEIVED', 'CREDIT', 'REFUND'].some((word) =>
        descriptionUpper.includes(word)
      )
    ) {
      return { category: 'Other non-essentials', needsReview: true }; // Credits need review
    }

    // Default fallback
    return { category: 'Other non-essentials', needsReview: true };
  }
}
