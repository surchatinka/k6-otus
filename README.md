## ЗАПУСК
```
k6 run -e GATEWAY=$GATEWAY_IP --log-format raw --console-output=test.log --out csv=test_result.csv hw.js
или
k6 run hw.js --http-debug=full 