## ЗАПУСК
```
k6 run -e GATEWAY=$GATEWAY_IP --log-format raw --console-output=test.log --out csv=test_result.csv hw-part1.js
или
k6 run hw-part1.js --http-debug=full 