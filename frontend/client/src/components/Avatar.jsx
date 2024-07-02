export default function Avatar({userId,username}){
    const colors = ['bg-red-200','bg-green-200','bg-purple-200','bg-blue-200','bg-yellow-200','bg-teal-200']

    
    return (
        <div className="w-8 h-8 bg-red-200 rounded-full flex items-center">
           <div className="text-center w-full">{username[0]}</div> 
        </div>
    )
}