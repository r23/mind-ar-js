const {TypedArray,KernelConfig} = require('@tensorflow/tfjs-core');
//const {MathBackendCPU} =require('@tensorflow/tfjs-backend-cpu');
const {MathBackendWebGL} = require('@tensorflow/tfjs-backend-webgl');

const cache={};

/**
 * 
 * @param {string} key 
 * @param {TensorInfo} image 
 * @returns {[GPGPUProgram,GPGPUProgram]}
 */
function GetKernels(image){
  const imageWidth = image.shape[1];
  const key = 'w' + imageWidth;
  if(!cache.hasOwnProperty(key)){
    const imageHeight = image.shape[0];
    const kernel1 = {
      variableNames: ['p'],
      outputShape: [imageHeight, imageWidth],
      userCode: `
        void main() {
          ivec2 coords = getOutputCoords();

          float sum = getP(coords[0], coords[1]-2);
          sum += getP(coords[0], coords[1]-1) * 4.;
          sum += getP(coords[0], coords[1]) * 6.;
          sum += getP(coords[0], coords[1]+1) * 4.;
          sum += getP(coords[0], coords[1]+2);
          setOutput(sum);
        }
      `
    };
    const kernel2 = {
      variableNames: ['p'],
      outputShape: [imageHeight, imageWidth],
      userCode: `
        void main() {
          ivec2 coords = getOutputCoords();

          float sum = getP(coords[0]-2, coords[1]);
          sum += getP(coords[0]-1, coords[1]) * 4.;
          sum += getP(coords[0], coords[1]) * 6.;
          sum += getP(coords[0]+1, coords[1]) * 4.;
          sum += getP(coords[0]+2, coords[1]);
          sum /= 256.;
          setOutput(sum);
        }
      `
    };
    cache[key]=[kernel1,kernel2];
  }
  return cache[key];
}

const binomialFilter = (args) =>{//{inputs: UnaryInputs, backend: MathBackendCPU}
  /** @type {import('@tensorflow/tfjs').TensorInfo} */
  const image = args.inputs.image;
  /** @type {MathBackendWebGL} */
  const backend = args.backend;
  
  const[kernel1,kernel2]=GetKernels(image);
  
  const result1=backend.runWebGLProgram(kernel1,[image],image.dtype);
  return backend.runWebGLProgram(kernel2,[result1],image.dtype);  
}




const binomialFilterConfig = {//: KernelConfig
    kernelName: "BinomialFilter",
    backendName: 'webgl',
    kernelFunc: binomialFilter,// as {} as KernelFunc,
};



module.exports={
  binomialFilterConfig,
  binomialFilter
}