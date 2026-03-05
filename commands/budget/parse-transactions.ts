import { Command } from 'jsr:@cliffy/command@1';
import { parse } from 'jsr:@std/csv';
import { format } from 'jsr:@std/datetime';
import { MerchantCategorizer } from './categorizer.ts';

interface Transaction {
  date: string;
  description: string;
  amount: number;
  category: string;
  reviewFlag: boolean;
  account: string;
}

class TransactionParser {
  private categorizer: MerchantCategorizer;
  private monthlyIncome: Record<string, number> = {};

  constructor(categorizer: MerchantCategorizer) {
    this.categorizer = categorizer;
  }

  private getMonthKey(dateStr: string): string {
    // Convert date to YYYY-MM format for monthly grouping
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
  }

  private extractAccountName(filePath: string): string {
    const fileName = filePath.split('/').pop() || filePath;

    // Handle specific known file names
    if (fileName.startsWith('accountactivity')) {
      return 'TD Credit Card';
    }
    if (fileName === 'Summary.csv') {
      return 'Amex Credit Card';
    }
    if (fileName.startsWith('Basic_Plus_')) {
      return 'Scotiabank Chequing';
    }
    if (fileName.startsWith('credit-card-statement-transactions-')) {
      return 'Wealthsimple Credit Card';
    }

    // Handle Wealthsimple investment accounts with emojis and nicknames
    if (fileName.includes('monthly-statement-transactions-')) {
      // Extract the nickname part (everything before "monthly-statement-transactions")
      const parts = fileName.split('-monthly-statement-transactions-');
      if (parts.length > 0) {
        return parts[0].trim();
      }
    }

    // Fallback to filename without extension
    return fileName.replace('.csv', '');
  }

  private parseDate(
    dateStr: string,
    format:
      | 'td'
      | 'wealthsimple'
      | 'wealthsimple_investment'
      | 'amex'
      | 'scotiabank',
  ): string {
    try {
      let date: Date;

      if (format === 'td') {
        // MM/DD/YYYY
        date = new Date(dateStr);
      } else if (format === 'wealthsimple') {
        // YYYY-MM-DD
        date = new Date(dateStr);
      } else if (format === 'wealthsimple_investment') {
        // YYYY-MM-DD
        date = new Date(dateStr);
      } else if (format === 'amex') {
        // DD MMM YYYY (e.g., "15 Sep 2025")
        date = new Date(dateStr);
      } else if (format === 'scotiabank') {
        // YYYY-MM-DD
        date = new Date(dateStr);
      } else {
        date = new Date(dateStr);
      }

      // Return in MM/DD/YYYY format for budget spreadsheet
      return `${(date.getMonth() + 1).toString().padStart(2, '0')}/${
        date.getDate().toString().padStart(2, '0')
      }/${date.getFullYear()}`;
    } catch {
      return dateStr; // Return original if parsing fails
    }
  }

  async parseTdCsv(filePath: string): Promise<Transaction[]> {
    const text = await Deno.readTextFile(filePath);
    const records = parse(text, { skipFirstRow: false }) as string[][];
    const transactions: Transaction[] = [];
    const accountName = this.extractAccountName(filePath);

    for (const row of records) {
      if (row.length >= 5) {
        const [dateStr, description, debit, credit] = row;

        const formattedDate = this.parseDate(dateStr, 'td');

        // Skip Royal Bank of Canada bill payments (these are transfers, not expenses)
        if (
          description.toUpperCase().includes('ROYAL BANK OF CANADA') &&
          credit && credit.trim()
        ) {
          continue;
        }

        // Determine amount (negative for expenses, positive for credits)
        let amount: number;
        if (debit && debit.trim()) {
          amount = -Math.abs(parseFloat(debit));
        } else if (credit && credit.trim()) {
          amount = parseFloat(credit);
        } else {
          continue;
        }

        // Categorize
        const { category, needsReview } = this.categorizer.categorize(
          description,
        );

        transactions.push({
          date: formattedDate,
          description,
          amount,
          category,
          reviewFlag: needsReview,
          account: accountName,
        });
      }
    }

    return transactions;
  }

  async parseWealthsimpleCsv(filePath: string): Promise<Transaction[]> {
    const text = await Deno.readTextFile(filePath);
    const lines = text.split('\n');
    const headers = lines[0].split(',').map((h) => h.replace(/"/g, ''));
    const transactions: Transaction[] = [];
    const accountName = this.extractAccountName(filePath);

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(',').map((v) => v.replace(/"/g, ''));
      if (values.length < 5) continue;

      const transaction_date = values[0];
      const type = values[2];
      const details = values[3];
      const amount = values[4];

      // Skip payments to credit card (they're not expenses)
      if (type.toUpperCase() === 'PAYMENT') {
        continue;
      }

      const formattedDate = this.parseDate(transaction_date, 'wealthsimple');

      // Amount should be negative for expenses
      const parsedAmount = -Math.abs(parseFloat(amount));

      // Categorize
      const { category, needsReview } = this.categorizer.categorize(details);

      transactions.push({
        date: formattedDate,
        description: details,
        amount: parsedAmount,
        category,
        reviewFlag: needsReview,
        account: accountName,
      });
    }

    return transactions;
  }

  async parseAmexCsv(filePath: string): Promise<Transaction[]> {
    const text = await Deno.readTextFile(filePath);
    const records = parse(text, { skipFirstRow: false }) as string[][];
    const transactions: Transaction[] = [];
    const accountName = this.extractAccountName(filePath);

    // Skip header row
    for (let i = 1; i < records.length; i++) {
      const row = records[i];
      if (row.length >= 4) {
        const [date, , description, amount] = row;

        // Skip if no amount or if it's a payment
        if (!amount || description.toUpperCase().includes('PAYMENT RECEIVED')) {
          continue;
        }

        const formattedDate = this.parseDate(date, 'amex');

        // Amount should be negative for expenses
        const parsedAmount = -Math.abs(parseFloat(amount));

        // Categorize
        const { category, needsReview } = this.categorizer.categorize(
          description,
        );

        transactions.push({
          date: formattedDate,
          description,
          amount: parsedAmount,
          category,
          reviewFlag: needsReview,
          account: accountName,
        });
      }
    }

    return transactions;
  }

  async parseScotiabankCsv(filePath: string): Promise<Transaction[]> {
    const text = await Deno.readTextFile(filePath);
    const lines = text.split('\n');
    const transactions: Transaction[] = [];
    const accountName = this.extractAccountName(filePath);

    // Skip header row (index 0)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Parse CSV line - Scotiabank format has: Filter,Date,Description,Sub-description,Type of Transaction,Amount,Balance
      const values = line.split(',').map((v) => v.replace(/"/g, ''));
      if (values.length < 7) continue;

      const filter = values[0];
      const date = values[1];
      const description = values[2];
      const subDescription = values[3];
      const transactionType = values[4];
      const amount = values[5];
      const balance = values[6];

      // Skip filter rows or empty transactions
      if (!date || !amount || filter.includes('Custom filters')) {
        continue;
      }

      const formattedDate = this.parseDate(date, 'scotiabank');

      // Combine description and sub-description
      const fullDescription = subDescription && subDescription.trim()
        ? `${description} ${subDescription}`.trim()
        : description;

      // Scotiabank amounts are already correctly signed (negative for debits)
      const parsedAmount = parseFloat(amount);

      // Categorize
      const { category, needsReview } = this.categorizer.categorize(
        fullDescription,
      );

      transactions.push({
        date: formattedDate,
        description: fullDescription,
        amount: parsedAmount,
        category,
        reviewFlag: needsReview,
        account: accountName,
      });
    }

    return transactions;
  }

  async parseWealthsimpleInvestmentCsv(
    filePath: string,
  ): Promise<Transaction[]> {
    const text = await Deno.readTextFile(filePath);
    const lines = text.split('\n');
    const transactions: Transaction[] = [];
    const accountName = this.extractAccountName(filePath);

    // Skip header row (index 0)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Parse CSV line - Wealthsimple investment format has: "date","transaction","description","amount","balance","currency"
      const values = line.split(',').map((v) => v.replace(/"/g, ''));
      if (values.length < 6) continue;

      const date = values[0];
      const transactionType = values[1];
      const description = values[2];
      const amount = values[3];
      const balance = values[4];
      const currency = values[5];

      // Skip if no amount or if currency is not CAD
      if (!amount || currency !== 'CAD') {
        continue;
      }

      // Skip certain transaction types that aren't relevant for budget tracking
      if (['INT'].includes(transactionType)) {
        // Interest earned is not an expense, skip for budget purposes
        continue;
      }

      // Skip payroll deposits, AMEX bill payments, and internal transfers
      if (
        transactionType === 'AFT_IN' &&
        description.includes('Direct deposit from Wealthsimple-OS')
      ) {
        // Track income by month but don't include in transactions
        const incomeAmount = parseFloat(amount);
        const monthKey = this.getMonthKey(date);
        this.monthlyIncome[monthKey] = (this.monthlyIncome[monthKey] || 0) +
          incomeAmount;
        continue;
      }

      if (
        transactionType === 'AFT_OUT' &&
        description.includes('Pre-authorized Debit to AMEX')
      ) {
        // Skip AMEX bill payments (internal transfer)
        continue;
      }

      if (
        transactionType.includes('TRFIN') || transactionType.includes('TRFOUT')
      ) {
        // Skip internal transfers
        continue;
      }

      const formattedDate = this.parseDate(date, 'wealthsimple_investment');

      // Wealthsimple investment amounts are already correctly signed
      const parsedAmount = parseFloat(amount);

      // Categorize - these are typically transfers or investment activities
      const { category, needsReview } = this.categorizer.categorize(
        description,
      );

      transactions.push({
        date: formattedDate,
        description: `${transactionType}: ${description}`,
        amount: parsedAmount,
        category,
        reviewFlag: needsReview,
        account: accountName,
      });
    }

    return transactions;
  }

  async exportToBudgetCsv(
    transactions: Transaction[],
    outputFile: string,
  ): Promise<void> {
    // Sort transactions by date (oldest first)
    const sortedTransactions = [...transactions].sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });

    const csvData = [
      ['Date', 'Description', 'Amount', 'Category', 'Account'],
      ...sortedTransactions.map((t) => [
        t.date,
        t.description,
        t.amount.toString(),
        t.reviewFlag ? '' : t.category, // Leave category blank if needs review
        t.account,
      ]),
    ];

    const csvContent = csvData.map((row) =>
      row.map((field) => `"${field.toString().replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    await Deno.writeTextFile(outputFile, csvContent);
  }

  showReviewSummary(transactions: Transaction[]): void {
    const reviewTransactions = transactions.filter((t) => t.reviewFlag);

    if (reviewTransactions.length > 0) {
      console.log(
        `\n🔍 ${reviewTransactions.length} transactions need review (categories left blank in CSV)`,
      );
    } else {
      console.log('\n✅ All transactions categorized successfully!');
    }
  }

  detectFileType(
    filePath: string,
  ): Promise<
    'td' | 'wealthsimple' | 'wealthsimple_investment' | 'amex' | 'scotiabank'
  > {
    return Deno.readTextFile(filePath).then((text) => {
      const firstLine = text.split('\n')[0].toLowerCase();

      // Check for Scotiabank headers
      if (
        firstLine.includes('filter') &&
        firstLine.includes('type of transaction')
      ) {
        return 'scotiabank';
      }

      // Check for Wealthsimple credit card headers
      if (firstLine.includes('transaction_date')) {
        return 'wealthsimple';
      }

      // Check for Wealthsimple investment/savings account headers
      if (
        firstLine.includes('date') && firstLine.includes('transaction') &&
        firstLine.includes('balance') && firstLine.includes('currency')
      ) {
        return 'wealthsimple_investment';
      }

      // Check for Amex headers
      if (
        firstLine.includes('date') && firstLine.includes('description') &&
        firstLine.includes('amount')
      ) {
        return 'amex';
      }

      // Default to TD (no headers)
      return 'td';
    });
  }

  async processFile(filePath: string, outputFile?: string): Promise<void> {
    try {
      await Deno.stat(filePath);
    } catch {
      console.error(`❌ Error: File ${filePath} not found`);
      return;
    }

    const fileType = await this.detectFileType(filePath);
    console.log(`📁 Detected file type: ${fileType}`);

    let transactions: Transaction[];

    if (fileType === 'td') {
      transactions = await this.parseTdCsv(filePath);
    } else if (fileType === 'wealthsimple') {
      transactions = await this.parseWealthsimpleCsv(filePath);
    } else if (fileType === 'wealthsimple_investment') {
      transactions = await this.parseWealthsimpleInvestmentCsv(filePath);
    } else if (fileType === 'amex') {
      transactions = await this.parseAmexCsv(filePath);
    } else if (fileType === 'scotiabank') {
      transactions = await this.parseScotiabankCsv(filePath);
    } else {
      console.error(`❌ Unknown file type: ${fileType}`);
      return;
    }

    if (!outputFile) {
      const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
      outputFile = `budget_transactions_${timestamp}.csv`;
    }

    await this.exportToBudgetCsv(transactions, outputFile);
    console.log(`✅ Processed ${transactions.length} transactions`);
    console.log(`📄 Output saved to: ${outputFile}`);

    this.showReviewSummary(transactions);
  }

  async scanDirectoryForCsvFiles(dirPath: string): Promise<string[]> {
    const csvFiles: string[] = [];

    try {
      const entries = await Array.fromAsync(Deno.readDir(dirPath));

      for (const entry of entries) {
        if (entry.isFile && entry.name.toLowerCase().endsWith('.csv')) {
          // Skip system files and temporary files
          if (!entry.name.startsWith('.') && !entry.name.startsWith('~')) {
            csvFiles.push(`${dirPath}/${entry.name}`);
          }
        }
      }

      // Sort files alphabetically for consistent processing order
      csvFiles.sort();
    } catch (error) {
      throw new Error(
        `Failed to read directory ${dirPath}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    return csvFiles;
  }

  async processDirectory(dirPath: string, outputFile?: string): Promise<void> {
    // Reset income tracking for new batch
    this.monthlyIncome = {};

    try {
      const stat = await Deno.stat(dirPath);
      if (!stat.isDirectory) {
        throw new Error(`${dirPath} is not a directory`);
      }
    } catch {
      console.error(
        `❌ Error: Directory ${dirPath} not found or not accessible`,
      );
      return;
    }

    console.log(`📂 Scanning directory: ${dirPath}`);
    const csvFiles = await this.scanDirectoryForCsvFiles(dirPath);

    if (csvFiles.length === 0) {
      console.log('❌ No CSV files found in directory');
      return;
    }

    console.log(`📄 Found ${csvFiles.length} CSV files to process:`);
    csvFiles.forEach((file) => console.log(`  - ${file.split('/').pop()}`));
    console.log('');

    const allTransactions: Transaction[] = [];
    const allReviewTransactions: Transaction[] = [];
    const processingSummary: Array<
      { file: string; count: number; reviewCount: number; fileType: string }
    > = [];

    for (const csvFile of csvFiles) {
      console.log(`🔄 Processing: ${csvFile.split('/').pop()}`);

      try {
        const fileType = await this.detectFileType(csvFile);
        console.log(`  📁 Detected file type: ${fileType}`);

        let transactions: Transaction[];

        if (fileType === 'td') {
          transactions = await this.parseTdCsv(csvFile);
        } else if (fileType === 'wealthsimple') {
          transactions = await this.parseWealthsimpleCsv(csvFile);
        } else if (fileType === 'wealthsimple_investment') {
          transactions = await this.parseWealthsimpleInvestmentCsv(csvFile);
        } else if (fileType === 'amex') {
          transactions = await this.parseAmexCsv(csvFile);
        } else if (fileType === 'scotiabank') {
          transactions = await this.parseScotiabankCsv(csvFile);
        } else {
          console.error(`  ❌ Unknown file type: ${fileType}`);
          continue;
        }

        const reviewTransactions = transactions.filter((t) => t.reviewFlag);

        console.log(
          `  ✅ Processed ${transactions.length} transactions (${reviewTransactions.length} need review)`,
        );

        allTransactions.push(...transactions);
        allReviewTransactions.push(...reviewTransactions);

        processingSummary.push({
          file: csvFile.split('/').pop() || csvFile,
          count: transactions.length,
          reviewCount: reviewTransactions.length,
          fileType,
        });
      } catch (error) {
        console.error(
          `  ❌ Error processing ${csvFile.split('/').pop()}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        continue;
      }

      console.log('');
    }

    // Generate output file
    if (!outputFile) {
      const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
      outputFile = `budget_transactions_batch_${timestamp}.csv`;
    }

    await this.exportToBudgetCsv(allTransactions, outputFile);

    // Show summary
    this.showBatchProcessingSummary(
      processingSummary,
      allTransactions.length,
      allReviewTransactions.length,
      outputFile,
      this.monthlyIncome,
    );

    if (allReviewTransactions.length > 0) {
      this.showReviewSummary(allReviewTransactions);
    }
  }

  showBatchProcessingSummary(
    processingSummary: Array<
      { file: string; count: number; reviewCount: number; fileType: string }
    >,
    totalTransactions: number,
    totalReviewTransactions: number,
    outputFile: string,
    monthlyIncome: Record<string, number>,
  ): void {
    console.log('='.repeat(80));
    console.log('📊 BATCH PROCESSING SUMMARY');
    console.log('='.repeat(80));

    console.log('\n📄 Files processed:');
    processingSummary.forEach((summary) => {
      const reviewText = summary.reviewCount > 0
        ? ` (${summary.reviewCount} flagged)`
        : '';
      console.log(
        `  ${summary.file.padEnd(50)} | ${summary.fileType.padEnd(12)} | ${
          summary.count.toString().padStart(3)
        } transactions${reviewText}`,
      );
    });

    console.log(
      `\n✅ Total: ${totalTransactions} transactions from ${processingSummary.length} files`,
    );
    if (totalReviewTransactions > 0) {
      console.log(`🔍 ${totalReviewTransactions} transactions need review`);
    }

    // Show monthly income breakdown
    const monthKeys = Object.keys(monthlyIncome).sort();
    if (monthKeys.length > 0) {
      console.log('\n💰 Monthly Income:');
      let totalIncome = 0;
      monthKeys.forEach((month) => {
        const amount = monthlyIncome[month];
        totalIncome += amount;
        console.log(`  ${month}: $${amount.toFixed(2)}`);
      });
      console.log(`  ────────────────────────`);
      console.log(
        `  Total: $${totalIncome.toFixed(2)} (excluded from transaction list)`,
      );
    }

    console.log(`\n📄 Output saved to: ${outputFile}`);
    console.log('='.repeat(80));
  }
}

export const parseTransactionsCommand = new Command()
  .description('Parse CSV transactions into budget format')
  .arguments('<input_path:string>')
  .option('-o, --output <file:string>', 'Output CSV file')
  .option('-d, --directory', 'Treat input as directory')
  .action(async ({ output, directory }, inputPath) => {
    const categorizer = await MerchantCategorizer.create();
    const parser = new TransactionParser(categorizer);

    try {
      const stat = await Deno.stat(inputPath);

      if (stat.isDirectory || directory) {
        await parser.processDirectory(inputPath, output);
      } else if (stat.isFile) {
        await parser.processFile(inputPath, output);
      } else {
        console.error('❌ Error: Input path is neither a file nor a directory');
      }
    } catch (error) {
      console.error(
        `❌ Error: ${error instanceof Error ? error.message : String(error)}`,
      );
      Deno.exit(1);
    }
  });
