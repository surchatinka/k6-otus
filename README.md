## ЗАПУСК
```
k6 run -e GATEWAY=$GATEWAY_IP --log-format raw --console-output=test.log --out csv=test_result.csv hw-part1.js
или
k6 run hw-part1.js --http-debug=full 

k6 run --out influxdb=http://localhost:8086/k6 script.js