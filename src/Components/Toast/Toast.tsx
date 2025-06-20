import { Cross2Icon } from '@radix-ui/react-icons';

interface IToast {
  message: string;
  onClose: () => void;
}

const Toast = ({ message, onClose }: IToast) => (
  <div className="fixed bottom-4 right-4 z-50 bg-green-200 text-green-900 px-4 py-3 rounded shadow-lg flex items-center animate-fade-in">
    <span>
      {message}
    </span>
    <button
      onClick={onClose}
      className="ml-4 p-1 rounded-full hover:bg-green-300"
    >
      <Cross2Icon className="w-3 h-3" />
    </button>
  </div>
)

export default Toast