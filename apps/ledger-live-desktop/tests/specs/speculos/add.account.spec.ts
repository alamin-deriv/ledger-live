import test from "../../fixtures/common";
import { specs } from "../../utils/speculos";
import { Currency } from "../../enum/Currency";
import { Application } from "tests/page";

const currencies: Currency[] = [
  Currency.BTC,
  Currency.tBTC,
  Currency.ETH,
  Currency.tETH,
  Currency.sepETH,
  Currency.XRP,
  Currency.DOT,
  Currency.TRX,
];

for (const [i, currency] of currencies.entries()) {
  test.describe.parallel("Accounts @smoke", () => {
    test.use({
      userdata: "skip-onboarding",
      testName: `addAccount_${currency.uiName}`,
      speculosCurrency: specs[currency.deviceLabel.replace(/ /g, "_")],
      speculosOffset: i,
    });
    let firstAccountName = "NO ACCOUNT NAME YET";

    //@TmsLink("B2CQA-101")
    //@TmsLink("B2CQA-102")
    //@TmsLink("B2CQA-314")
    //@TmsLink("B2CQA-330")
    //@TmsLink("B2CQA-929")

    test(`[${currency.uiName}] Add account`, async ({ page }) => {
      const app = new Application(page);

      await app.portfolio.openAddAccountModal();
      await app.addAccount.expectModalVisiblity();
      await app.addAccount.selectCurrency(currency.uiName);
      firstAccountName = await app.addAccount.getFirstAccountName();

      await app.addAccount.addAccounts();
      await app.addAccount.done();
      await app.layout.expectBalanceVisibility();

      await app.layout.goToAccounts();
      await app.accounts.navigateToAccountByName(firstAccountName);
      await app.account.expectAccountVisibility(firstAccountName);
      await app.account.expectLastOperationsVisibility();
    });
  });
}
