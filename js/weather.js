// 天气查询模块：集成高德JS插件和Web服务，保持现有接口

// 天气查询函数 - 集成高德地图天气API
async function getWeatherInfo(cityName, travelDate) {
    try {
        console.log(`🌤️ 开始查询${cityName}的天气信息...`);

        // 规范化城市名称，便于JS插件查询（如“杭州” -> “杭州市”）
        const normalizeCityName = (name) => {
            if (!name) return '';
            let n = name.trim();
            if (!/(市|地区|自治州|盟)$/.test(n)) n += '市';
            return n;
        };
        const normalizedCity = normalizeCityName(cityName);

        // 优先使用JS插件获取天气（无需Web服务Key）
        let currentWeather = null;
        let forecast = null;
        try {
            await new Promise((resolve, reject) => {
                if (window.AMapLoader) {
                    AMapLoader.load({
                        key: 'a7dd919baf2818a9b9fd7cbdeadba786',
                        version: '2.0',
                        plugins: ['AMap.Weather']
                    }).then(resolve).catch(reject);
                } else {
                    reject(new Error('高德地图加载器未找到'));
                }
            });

            const weather = new AMap.Weather();
            // 获取实时天气
            const liveData = await new Promise((resolve, reject) => {
                weather.getLive(normalizedCity, (err, data) => {
                    if (err) return reject(err);
                    resolve(data);
                });
            });
            // 统一字段到Web服务风格
            currentWeather = {
                weather: liveData.weather,
                temperature: String(liveData.temperature),
                humidity: String(liveData.humidity),
                winddirection: liveData.windDirection || liveData.winddirection || '',
                windpower: liveData.windPower || liveData.windpower || '',
                reporttime: liveData.reportTime || new Date().toISOString(),
                source: 'amap_js'
            };

            // 获取未来天气
            const forecastData = await new Promise((resolve, reject) => {
                weather.getForecast(normalizedCity, (err, data) => {
                    if (err) return reject(err);
                    resolve(data);
                });
            });
            const rawForecasts = (forecastData && forecastData.forecasts) ? forecastData.forecasts : [];
            const mappedForecasts = rawForecasts.map(f => ({
                date: f.date || f.reportDate || '',
                dayweather: f.dayWeather || f.dayweather || '',
                nightweather: f.nightWeather || f.nightweather || '',
                daytemp: String(f.dayTemp || f.daytemp || ''),
                nighttemp: String(f.nightTemp || f.nighttemp || ''),
                daywind: f.dayWindDirection || f.daywind || '',
                nightwind: f.nightWindDirection || f.nightwind || '',
                daypower: f.dayWindPower || f.daypower || '',
                nightpower: f.nightWindPower || f.nightpower || '',
                source: 'amap_js'
            }));

            if (travelDate) {
                const targetDateStr = new Date(travelDate).toISOString().split('T')[0];
                const matching = mappedForecasts.find(c => (new Date(c.date).toISOString().split('T')[0]) === targetDateStr);
                forecast = matching ? [matching] : mappedForecasts;
            } else {
                forecast = mappedForecasts;
            }
        } catch (pluginErr) {
            console.warn('⚠️ JS插件获取天气失败，尝试Web服务接口:', pluginErr);
        }

        // 如果JS插件成功，直接返回
        if (currentWeather) {
            const weatherInfo = {
                city: cityName,
                adcode: null,
                current: currentWeather,
                forecast: forecast,
                travelDate: travelDate,
                queryTime: new Date().toISOString()
            };
            console.log('✅ 天气信息查询成功(JS插件):', weatherInfo);
            return weatherInfo;
        }

        // 退回到Web服务：需要adcode
        const adcode = await getCityAdcode(cityName);
        if (!adcode) {
            throw new Error(`无法获取${cityName}的城市编码`);
        }
        const currentWeatherWS = await getCurrentWeather(adcode);
        let forecastWS = null;
        if (travelDate) {
            forecastWS = await getWeatherForecast(adcode, travelDate);
        }

        const weatherInfoWS = {
            city: cityName,
            adcode: adcode,
            current: currentWeatherWS,
            forecast: forecastWS,
            travelDate: travelDate,
            queryTime: new Date().toISOString()
        };
        console.log('✅ 天气信息查询成功(Web服务):', weatherInfoWS);
        return weatherInfoWS;

    } catch (error) {
        console.error('❌ 天气查询失败:', error);
        // 返回模拟天气数据作为降级方案
        const fallbackWeather = {
            city: cityName,
            adcode: null,
            current: {
                weather: '晴',
                temperature: '22',
                winddirection: '东南',
                windpower: '3级',
                humidity: '65',
                reporttime: new Date().toISOString(),
                source: 'fallback'
            },
            forecast: travelDate ? [{
                date: travelDate,
                dayweather: '多云',
                nightweather: '晴',
                daytemp: '25',
                nighttemp: '18',
                daywind: '东南风',
                nightwind: '东南风',
                daypower: '3级',
                nightpower: '2级',
                source: 'fallback'
            }] : null,
            travelDate: travelDate,
            queryTime: new Date().toISOString(),
            error: error.message
        };
        console.log('⚠️ 使用模拟天气数据:', fallbackWeather);
        return fallbackWeather;
    }
}

// 获取城市adcode（优先使用JS地理编码插件，失败再走Web服务）
async function getCityAdcode(cityName) {
    // 规范化城市名称，便于JS插件查询（如“杭州” -> “杭州市”）
    const normalizeCityName = (name) => {
        if (!name) return '';
        let n = name.trim();
        if (!/(市|地区|自治州|盟)$/.test(n)) n += '市';
        return n;
    };
    const normalizedCity = normalizeCityName(cityName);

    // 1) 优先使用 AMap.Geocoder 插件
    try {
        await new Promise((resolve, reject) => {
            if (window.AMapLoader) {
                AMapLoader.load({
                    key: 'a7dd919baf2818a9b9fd7cbdeadba786',
                    version: '2.0',
                    plugins: ['AMap.Geocoder']
                }).then(resolve).catch(reject);
            } else {
                reject(new Error('高德地图加载器未找到'));
            }
        });

        const geocoder = new AMap.Geocoder({ city: normalizedCity });
        const geocode = await new Promise((resolve, reject) => {
            geocoder.getLocation(normalizedCity, (status, result) => {
                try {
                    if (status === 'complete' && result && result.geocodes && result.geocodes.length > 0) {
                        resolve(result.geocodes[0]);
                    } else {
                        reject(new Error('JS地理编码未找到结果'));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });

        const adcode = geocode.adcode || (geocode.addressComponent && geocode.addressComponent.adcode);
        if (adcode) {
            console.log(`✅ 获取${cityName}的adcode(JS): ${adcode}`);
            return adcode;
        } else {
            throw new Error('JS地理编码返回无adcode');
        }
    } catch (jsError) {
        console.warn('⚠️ 使用JS地理编码获取adcode失败，尝试Web服务接口:', jsError);
    }

    // 2) 退回到Web服务接口
    try {
        const response = await fetch(`https://restapi.amap.com/v3/config/district?key=a7dd919baf2818a9b9fd7cbdeadba786&keywords=${encodeURIComponent(cityName)}&subdistrict=0`);
        if (!response.ok) {
            throw new Error(`获取城市信息失败: ${response.status}`);
        }
        const data = await response.json();
        if (data.status === '1' && data.districts && data.districts.length > 0) {
            const adcode = data.districts[0].adcode;
            console.log(`✅ 获取${cityName}的adcode(Web): ${adcode}`);
            return adcode;
        } else {
            throw new Error(`未找到城市${cityName}的信息`);
        }
    } catch (error) {
        console.error(`❌ 获取${cityName}的adcode失败:`, error);
        // 3) 预设映射作为最终降级方案
        const cityAdcodeMap = {
            '北京': '110000',
            '上海': '310000',
            '广州': '440100',
            '深圳': '440300',
            '杭州': '330100',
            '南京': '320100',
            '苏州': '320500',
            '成都': '510100',
            '重庆': '500000',
            '西安': '610100',
            '武汉': '420100',
            '天津': '120000',
            '青岛': '370200',
            '大连': '210200',
            '厦门': '350200',
            '宁波': '330200',
            '无锡': '320200',
            '长沙': '430100',
            '郑州': '410100',
            '沈阳': '210100'
        };
        const adcode = cityAdcodeMap[cityName];
        if (adcode) {
            console.log(`✅ 使用预设adcode: ${cityName} -> ${adcode}`);
            return adcode;
        }
        return null;
    }
}

// 获取实时天气
async function getCurrentWeather(adcode) {
    try {
        const response = await fetch(`https://restapi.amap.com/v3/weather/weatherInfo?key=a7dd919baf2818a9b9fd7cbdeadba786&city=${adcode}&extensions=base`);
        
        if (!response.ok) {
            throw new Error(`获取实时天气失败: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === '1' && data.lives && data.lives.length > 0) {
            const weather = data.lives[0];
            console.log('✅ 实时天气查询成功:', weather);
            return {
                ...weather,
                source: 'amap'
            };
        } else {
            throw new Error('实时天气数据格式错误');
        }
        
    } catch (error) {
        console.error('❌ 实时天气查询失败:', error);
        throw error;
    }
}

// 获取天气预报
async function getWeatherForecast(adcode, targetDate) {
    try {
        const response = await fetch(`https://restapi.amap.com/v3/weather/weatherInfo?key=a7dd919baf2818a9b9fd7cbdeadba786&city=${adcode}&extensions=all`);
        
        if (!response.ok) {
            throw new Error(`获取天气预报失败: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.status === '1' && data.forecasts && data.forecasts.length > 0) {
            const forecasts = data.forecasts[0].casts;
            console.log('✅ 天气预报查询成功:', forecasts);
            
            // 如果指定了日期，尝试找到对应日期的预报
            if (targetDate) {
                const targetDateStr = new Date(targetDate).toISOString().split('T')[0];
                const matchingForecast = forecasts.find(cast => {
                    const castDate = new Date(cast.date).toISOString().split('T')[0];
                    return castDate === targetDateStr;
                });
                
                if (matchingForecast) {
                    return [{
                        ...matchingForecast,
                        source: 'amap'
                    }];
                }
            }
            
            // 返回所有预报数据
            return forecasts.map(cast => ({
                ...cast,
                source: 'amap'
            }));
        } else {
            throw new Error('天气预报数据格式错误');
        }
        
    } catch (error) {
        console.error('❌ 天气预报查询失败:', error);
        throw error;
    }
}