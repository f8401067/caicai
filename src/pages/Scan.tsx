import React, { useState, useRef, useEffect } from 'react';
import { Camera, ChevronLeft, CheckCircle, XCircle, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { LotteryType, LOTTERY_CONFIGS, BallNumbers } from '../types';
import { parseDrawNumbers, calculatePrize, generateRandomNumbers } from '../utils/lottery';
import { extractLotteryNumbers } from '../utils/ocrExtract';
import { baiduOcrRecognize, fileToBase64 } from '../utils/baiduOcr';
import { Ball } from '../components/common/Ball';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';

function EditModal({
  bet,
  betIndex,
  config,
  onClose,
  onSave,
}: {
  bet: BallNumbers;
  betIndex: number;
  config: { redCount: number; redMax: number; blueCount: number; blueMax: number };
  onClose: () => void;
  onSave: (red: number[], blue: number[]) => void;
}) {
  const [red, setRed] = useState<number[]>([...bet.red]);
  const [blue, setBlue] = useState<number[]>([...bet.blue]);

  const handleRedToggle = (num: number) => {
    if (red.includes(num)) {
      setRed(red.filter(n => n !== num));
    } else if (red.length < config.redCount) {
      setRed([...red, num].sort((a, b) => a - b));
    }
  };

  const handleBlueToggle = (num: number) => {
    if (blue.includes(num)) {
      setBlue(blue.filter(n => n !== num));
    } else if (blue.length < config.blueCount) {
      setBlue([...blue, num].sort((a, b) => a - b));
    }
  };

  const handleQuickPick = () => {
    const nums = generateRandomNumbers(
      config.blueCount > 0 ? LotteryType.SHUANGSEQIU : LotteryType.DALETOU
    );
    setRed(nums.red);
    setBlue(nums.blue);
  };

  const isReady = red.length === config.redCount && (config.blueCount === 0 || blue.length === config.blueCount);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] overflow-y-auto p-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-base">编辑第{betIndex + 1}注</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded-lg text-gray-400">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-gray-400">
              红球 <span className="text-red-400">({red.length}/{config.redCount})</span>
            </p>
            <button onClick={handleQuickPick} className="text-xs text-amber-400 hover:text-amber-300">
              机选
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: config.redMax }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                onClick={() => handleRedToggle(num)}
                className={`aspect-square rounded-full font-bold transition-all text-[10px] leading-none ${
                  red.includes(num)
                    ? 'bg-red-500 text-white scale-105'
                    : 'bg-gray-700 text-white hover:bg-gray-600'
                }`}
              >
                {String(num).padStart(2, '0')}
              </button>
            ))}
          </div>
        </div>

        {config.blueCount > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-400 mb-1.5">
              蓝球 <span className="text-blue-400">({blue.length}/{config.blueCount})</span>
            </p>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: config.blueMax }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  onClick={() => handleBlueToggle(num)}
                  className={`aspect-square rounded-full font-bold transition-all text-[10px] leading-none ${
                    blue.includes(num)
                      ? 'bg-blue-500 text-white scale-105'
                      : 'bg-gray-700 text-white hover:bg-gray-600'
                  }`}
                >
                  {String(num).padStart(2, '0')}
                </button>
              ))}
            </div>
          </div>
        )}

        <Button
          className="w-full text-sm"
          onClick={() => { onSave(red, blue); onClose(); }}
          disabled={!isReady}
        >
          确定
        </Button>
      </div>
    </div>
  );
}



export default function Scan() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'scan' | 'result'>('scan');
  const [ocrNumbersList, setOcrNumbersList] = useState<BallNumbers[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ocrMsg, setOcrMsg] = useState('');
  const [latestOcrText, setLatestOcrText] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [ocrError, setOcrError] = useState(false);
  const [issueNumber, setIssueNumber] = useState<string | null>(null);
  const [lotteryCategory, setLotteryCategory] = useState<'体彩' | '福彩' | null>(null);
  const [lotteryName, setLotteryName] = useState<string | null>(null);
  const [betType, setBetType] = useState<'单式' | '复式' | null>(null);
  const [detectedType, setDetectedType] = useState<LotteryType | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // 根据检测到的彩票类型获取配置
  const config = detectedType ? LOTTERY_CONFIGS[detectedType] : null;
  const { addVerifyRecord, drawHistory } = useAppStore();
  
  // 确保从 localStorage 获取最新数据
  const getHistory = () => {
    if (!detectedType) return [];
    // 先从 store 中获取
    const storeHistory = drawHistory[detectedType] || [];
    if (storeHistory.length > 0) return storeHistory;
    
    // 如果 store 为空，尝试从 localStorage 直接读取
    try {
      const stored = localStorage.getItem('caicai-storage');
      if (stored) {
        const parsed = JSON.parse(stored);
        const historyData = parsed.state?.drawHistory?.[detectedType] || [];
        // 临时调试：显示读取到的数据
        alert(`从localStorage读取: detectedType=${detectedType}, history长度=${historyData.length}, 第一期=${historyData[0]?.issueno || '无'}`);
        return historyData;
      } else {
        alert('localStorage中没有找到caicai-storage');
      }
    } catch (e) {
      alert('读取localStorage失败: ' + e.message);
    }
    return [];
  };
  
  const history = getHistory();
  
  // 根据识别到的期号查找对应的开奖结果（支持模糊匹配）
  const drawResult = issueNumber ? history.find(r => {
    if (r.issueno === issueNumber) return true;
    // 如果长度不同，尝试后缀匹配
    if (r.issueno.length !== issueNumber.length) {
      return r.issueno.endsWith(issueNumber);
    }
    return false;
  }) : null;
  const drawNumbers = drawResult ? parseDrawNumbers(drawResult) : null;

  // 百度 OCR API 密钥配置
  const BAIDU_API_KEY = '2wG1155u8JeDa1A9h6tlT8PD';
  const BAIDU_SECRET_KEY = 'oKI4gtuvaqVoUCB2Y6Dhx5gEQ4vBkVvR';

  // 确保数据从localStorage加载
  useEffect(() => {
    // persist中间件会自动恢复数据，这里只是确保组件重新渲染
    const store = useAppStore.getState();
    // 触发一次状态更新以确保数据同步
    if (detectedType && (!history || history.length === 0)) {
      // 如果检测到类型但没有历史数据，尝试重新获取
      const refreshedHistory = useAppStore.getState().drawHistory[detectedType] || [];
      // 这会触发组件重新渲染
    }
  }, [detectedType]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setLoading(true);

    try {
      setOcrMsg('正在使用百度 OCR 识别...');
      const base64 = await fileToBase64(file);
      const ocrText = await baiduOcrRecognize(base64, {
        apiKey: BAIDU_API_KEY,
        secretKey: BAIDU_SECRET_KEY,
      });

      // 先尝试检测彩票类型（使用大乐透作为默认检测类型）
      const detectResult = extractLotteryNumbers(ocrText, LotteryType.DALETOU);
      
      // 根据检测到的彩票名称自动判断类型
      let autoDetectedType = LotteryType.DALETOU; // 默认大乐透
      if (detectResult.lotteryName) {
        const name = detectResult.lotteryName;
        if (name.includes('双色球')) {
          autoDetectedType = LotteryType.SHUANGSEQIU;
        } else if (name.includes('大乐透')) {
          autoDetectedType = LotteryType.DALETOU;
        }
      }
      
      // 重新用检测到的类型提取
      const result = extractLotteryNumbers(ocrText, autoDetectedType);
      
      setDetectedType(autoDetectedType);
      setLatestOcrText(result.rawText);
      setIssueNumber(result.issueNumber);
      setLotteryCategory(result.lotteryCategory || null);
      setLotteryName(result.lotteryName || null);
      setBetType(result.betType || null);

      if (!result.valid) {
        setOcrNumbersList([]);
        setOcrError(true);
        setOcrMsg('识别失败：号码与' + LOTTERY_CONFIGS[autoDetectedType].name + '规则不符，请重新拍照');
      } else {
        setOcrNumbersList(result.numbersList);
        setOcrError(false);
        setOcrMsg(`识别完成，共${result.numbersList.length}注`);
        
        // 自动验奖：查找对应期号的开奖结果
        const issueNo = result.issueNumber;
        if (issueNo) {
          // 重新从 store/localStorage 获取最新数据（避免闭包问题）
          const currentHistory = (() => {
            const storeHistory = useAppStore.getState().drawHistory[autoDetectedType] || [];
            if (storeHistory.length > 0) return storeHistory;
            
            try {
              const stored = localStorage.getItem('caicai-storage');
              if (stored) {
                const parsed = JSON.parse(stored);
                return parsed.state?.drawHistory?.[autoDetectedType] || [];
              }
            } catch (e) {
              // 忽略错误
            }
            return [];
          })();
          
          // 模糊匹配：支持5位和7位期号格式（如"26052"匹配"2026052"）
          const drawResult = currentHistory.find(r => {
            if (r.issueno === issueNo) return true;
            // 如果长度不同，尝试后缀匹配
            if (r.issueno.length !== issueNo.length) {
              return r.issueno.endsWith(issueNo);
            }
            return false;
          });
          
          if (drawResult) {
            // 找到对应期号，设置开奖结果并显示中奖信息
            const drawNums = parseDrawNumbers(drawResult);
            setStep('result');
            
            // 计算中奖情况，收集所有注
            const bets = result.numbersList.map((numbers, idx) => {
              const prize = calculatePrize(autoDetectedType, numbers, drawNums);
              const matchedRed = numbers.red.filter(n => drawNums.red.includes(n));
              const matchedBlue = numbers.blue.filter(n => drawNums.blue.includes(n));
              return {
                numbers,
                matched: { red: matchedRed, blue: matchedBlue },
                prize: prize?.name,
                wonAmount: prize?.bonus,
              };
            });
            
            // 一次验奖合并为一条记录
            const firstBet = bets[0];
            addVerifyRecord({
              type: autoDetectedType,
              numbers: firstBet.numbers,
              bets,
              drawResult: drawNums,
              matched: firstBet.matched,
              prize: firstBet.prize,
              wonAmount: firstBet.wonAmount,
              amount: 2,
            });
          } else {
            // 提供更详细的错误信息
            const hasHistory = currentHistory.length > 0;
            const allIssues = currentHistory.map(r => r.issueno).join(', ');
            setOcrMsg(`识别完成，但未找到第${issueNo}期的开奖结果（数据${hasHistory ? '已加载' : '未加载'}，共${currentHistory.length}期，期号：${allIssues || '无'}）`);
          }
        }
      }
    } catch (err) {
      setOcrMsg('识别失败，请手动输入');
      setOcrError(true);
      setDetectedType(LotteryType.DALETOU);
      setOcrNumbersList([generateRandomNumbers(LotteryType.DALETOU)]);
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  const handleSaveBetEdit = (betIndex: number, red: number[], blue: number[]) => {
    setOcrNumbersList(prev => {
      const newList = [...prev];
      newList[betIndex] = { red, blue };
      return newList;
    });
  };

  const handleAddBet = () => {
    if (!detectedType) return;
    setOcrNumbersList(prev => [...prev, generateRandomNumbers(detectedType)]);
  };

  const handleRemoveBet = (index: number) => {
    setOcrNumbersList(prev => prev.filter((_, i) => i !== index));
  };

  const handleQuickPick = (index: number) => {
    if (!detectedType) return;
    setOcrNumbersList(prev => {
      const newList = [...prev];
      newList[index] = generateRandomNumbers(detectedType);
      return newList;
    });
  };

  const resetState = () => {
    setStep('scan');
    setPreviewUrl(null);
    setOcrNumbersList([]);
    setOcrMsg('');
    setLatestOcrText('');
    setEditingIndex(null);
    setOcrError(false);
    setIssueNumber(null);
    setLotteryCategory(null);
    setLotteryName(null);
    setBetType(null);
    setDetectedType(null);
  };

  const isReady = detectedType && ocrNumbersList.length > 0 && ocrNumbersList.every(bet =>
    config && bet.red.length === config.redCount &&
    (config.blueCount === 0 || bet.blue.length === config.blueCount)
  );

  return (
    <div className="min-h-screen pb-20">
      <div className="sticky top-0 z-40 bg-gray-900 border-b border-gray-800 px-3 py-2">
        <div className="flex items-center gap-2">
          <button onClick={step === 'result' ? resetState : () => navigate(-1)} className="p-1 hover:bg-gray-800 rounded-lg">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold">
            {step === 'scan' ? '扫一扫验奖' : '验奖结果'}
          </h1>
        </div>
      </div>

      {step === 'scan' && (
        <div className="p-2 space-y-2">
          {previewUrl ? (
            <>
              {/* 识别结果区域 - 放在上面 */}
              <div className="space-y-2">
                {/* 提示信息 */}
                {loading && (
                  <p className="text-xs text-amber-400 text-center animate-pulse">{ocrMsg}</p>
                )}
                {!loading && ocrMsg && (
                  <p className={`text-xs text-center ${ocrError ? 'text-red-400' : 'text-green-400'}`}>{ocrMsg}</p>
                )}

                {/* 彩票信息 */}
                {(issueNumber || lotteryCategory || lotteryName || betType) && (
                  <div className="bg-gray-800 rounded-lg p-2 space-y-1">
                    {issueNumber && (
                      <p className="text-xs text-gray-400 text-center">第{issueNumber}期</p>
                    )}
                    {lotteryCategory && (
                      <p className="text-xs text-gray-400 text-center">{lotteryCategory}</p>
                    )}
                    {lotteryName && (
                      <p className="text-xs text-gray-400 text-center">{lotteryName}</p>
                    )}
                    {betType && (
                      <p className="text-xs text-gray-400 text-center">{betType}</p>
                    )}
                  </div>
                )}

                {/* 识别的号码列表 */}
                {ocrError ? (
                  <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3 text-center">
                    <p className="text-red-400 text-xs font-medium">{ocrMsg}</p>
                    <p className="text-gray-500 text-xs mt-1">请调整拍摄角度后重新拍照识别</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {ocrNumbersList.map((bet, betIndex) => (
                      <div key={betIndex} className="bg-gray-800 rounded-lg py-1.5 px-2 flex items-center gap-1.5">
                        <div className="flex gap-1 items-center">
                          {bet.red.map((num, i) => (
                            <Ball key={`r-${i}`} number={num} type="red" size="md" />
                          ))}
                          {bet.blue.length > 0 && <span className="text-gray-600 mx-0.5 text-xs">|</span>}
                          {bet.blue.map((num, i) => (
                            <Ball key={`b-${i}`} number={num} type="blue" size="md" />
                          ))}
                        </div>
                        <div className="flex gap-1 ml-auto">
                          <button
                            onClick={() => setEditingIndex(betIndex)}
                            className="px-2 py-0.5 text-[10px] text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                          >
                            编辑
                          </button>
                          {ocrNumbersList.length > 1 && (
                            <button
                              onClick={() => handleRemoveBet(betIndex)}
                              className="px-2 py-0.5 text-[10px] text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded"
                            >
                              删除
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    <button
                      onClick={handleAddBet}
                      className="w-full py-1.5 border border-dashed border-gray-600 rounded-lg text-xs text-gray-500 hover:border-gray-400 hover:text-gray-300 flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> 添加一注
                    </button>
                  </div>
                )}
              </div>

              {/* 图片区域 - 放在下面，缩小显示 */}
              <div className="w-full max-w-xs mx-auto">
                <div className="rounded-lg overflow-hidden border border-gray-700">
                  <img src={previewUrl} alt="彩票" className="w-full" />
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 text-sm" onClick={resetState}>
                  重新扫描
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="aspect-square bg-gray-800 rounded-xl relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-3 border-2 border-dashed border-gray-600 rounded-xl" />
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                  <Camera className="w-10 h-10 text-gray-600 mb-2" />
                  <p className="text-gray-400 text-sm mb-2">拍照或相册选择彩票</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black rounded-lg text-sm"
                    >
                      拍照
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-transparent border border-gray-600 text-white hover:bg-gray-700 rounded-lg text-sm"
                    >
                      相册
                    </button>
                  </div>
                </div>
              </div>

              <Card className="p-3">
                <h3 className="font-semibold text-sm mb-2">或者</h3>
                <Button variant="outline" className="w-full text-sm" onClick={() => {
                  if (!detectedType) setDetectedType(LotteryType.DALETOU);
                  setOcrNumbersList([generateRandomNumbers(detectedType || LotteryType.DALETOU)]);
                }}>
                  手动机选号码
                </Button>
              </Card>
            </>
          )}
        </div>
      )}

      {step === 'result' && ocrNumbersList.length > 0 && drawNumbers && detectedType && (
        <div className="p-2 space-y-2">
          {(() => {
            // 计算总奖金和中奖注数
            let totalBonus = 0;
            const prizes: Array<{ name: string; bonus: number }> = [];
            
            ocrNumbersList.forEach(numbers => {
              const prize = calculatePrize(detectedType, numbers, drawNumbers);
              if (prize) {
                totalBonus += prize.bonus;
                prizes.push(prize);
              }
            });

            return (
              <>
                {/* 中奖信息 */}
                <Card className="text-center py-4">
                  {totalBonus > 0 ? (
                    <>
                      <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                      <h2 className="text-lg font-bold text-green-400 mb-0.5">恭喜中奖！</h2>
                      <p className="text-sm mb-0.5">共{prizes.length}注中奖</p>
                      <p className="text-xl font-bold text-amber-500">
                        ¥{totalBonus.toLocaleString()}
                      </p>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-12 h-12 mx-auto mb-2 text-gray-600" />
                      <h2 className="text-lg font-bold text-gray-400 mb-0.5">未中奖</h2>
                      <p className="text-gray-500 text-sm">下次一定会中的！</p>
                    </>
                  )}
                </Card>

                {/* 开奖号码 - 放在最上面 */}
                <Card className="p-2 bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-purple-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs text-purple-400 font-semibold">第{issueNumber}期 开奖号码</h3>
                    <span className="text-xs text-gray-500">{lotteryName || ''}</span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap items-center justify-center">
                    {drawNumbers.red.map((num, i) => (
                      <Ball key={`dr-${i}`} number={num} type="red" size="md" matched={true} />
                    ))}
                    {drawNumbers.blue.length > 0 && <div className="w-px h-4 bg-gray-600 mx-1" />}
                    {drawNumbers.blue.map((num, i) => (
                      <Ball key={`db-${i}`} number={num} type="blue" size="md" matched={true} />
                    ))}
                  </div>
                </Card>

                {/* 用户彩票号码 - 放在下面 */}
                <div className="space-y-2">
                  <h3 className="text-xs text-gray-400 px-1">我的彩票</h3>
                  {ocrNumbersList.map((numbers, betIndex) => {
                    const prize = calculatePrize(detectedType!, numbers, drawNumbers);

                    return (
                      <Card key={betIndex} className={`p-2 ${prize ? 'border-green-500/50 bg-green-900/10' : ''}`}>
                        {prize && (
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs text-gray-400">第{betIndex + 1}注</span>
                            <span className="text-xs text-green-400 font-semibold">{prize.name} ¥{prize.bonus.toLocaleString()}</span>
                          </div>
                        )}
                        {!prize && (
                          <div className="mb-1.5">
                            <span className="text-xs text-gray-400">第{betIndex + 1}注</span>
                          </div>
                        )}
                        <div className="flex gap-1.5 flex-wrap items-center justify-center">
                          {numbers.red.map((num, i) => (
                            <Ball
                              key={`mr-${i}`}
                              number={num}
                              type="red"
                              size="md"
                              matched={drawNumbers.red.includes(num)}
                            />
                          ))}
                          {numbers.blue.length > 0 && <div className="w-px h-4 bg-gray-600 mx-1" />}
                          {numbers.blue.map((num, i) => (
                            <Ball
                              key={`mb-${i}`}
                              number={num}
                              type="blue"
                              size="md"
                              matched={drawNumbers.blue.includes(num)}
                            />
                          ))}
                        </div>
                      </Card>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 text-sm" onClick={() => navigate('/')}>
                    返回首页
                  </Button>
                  <Button className="flex-1 text-sm" onClick={resetState}>
                    继续验奖
                  </Button>
                </div>

                {/* 识别图片 - 放在最下面，缩小显示 */}
                {previewUrl && (
                  <div className="w-full max-w-xs mx-auto mt-2">
                    <div className="rounded-lg overflow-hidden border border-gray-700">
                      <img src={previewUrl} alt="彩票" className="w-full" />
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {editingIndex !== null && ocrNumbersList[editingIndex] && (
        <EditModal
          bet={ocrNumbersList[editingIndex]}
          betIndex={editingIndex}
          config={config}
          onClose={() => setEditingIndex(null)}
          onSave={(red, blue) => handleSaveBetEdit(editingIndex, red, blue)}
        />
      )}

      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFileSelect} />
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileSelect} />
    </div>
  );
}