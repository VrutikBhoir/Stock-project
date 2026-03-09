from backend.app.services.portfolio_risk_engine import calculate_portfolio_risk
import traceback

try:
    result = calculate_portfolio_risk('d1076f2c-e511-4fc6-967d-5d38b061efed')
    print('SUCCESS:', result)
except Exception as e:
    print('ERROR:', str(e))
    traceback.print_exc()
