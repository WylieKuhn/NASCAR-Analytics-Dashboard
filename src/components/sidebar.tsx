import {ChevronFirst} from "lucide-react";


export default function Sidebar({}) {
    const menuItems = [
        {
            label: "Inventory", submenu: [
                {name: "Add Item"},
                {name: "Log Inventory"},
                {name: "Analytics"}
            ]
        },
        {
            label: "Crops", submenu: [
                {name: "Create Field"},
                {name: "Log Planting"},
                {name: "Analytics"}
            ]
        },
        {
            label: "Assets", submenu: [
                {name: "Add Asset"},
                {name: "See Assets"},
                {name: "Analytics"}
            ]
        },
    ]

    return (
        <header className="fixed z-50 top-0 bg-white/80 backdrop-blur-2xl w-full shadow rounded-2xl">
            <nav>
                <div className="flex items-center h-16 justify-center gap-5">
                    {menuItems.map((item) => (
                        <div key={item.label} className="group relative flex items-center">
                            <button>{item.label}</button>
                            <div className="invisible absolute left-0 top-full mt-3
                            min-w[220px] rounded-lg border bg-gray-50 shadow-lg
                            opacity-0 transition-all group-hover:visible group-hover:opacity-100">
                                {item.submenu.map((subItem) => (
                                    <a key={subItem.name} href="#" className="block px-4 py-3 hover:bg-gray-100">{subItem.name}</a>
                                ))}

                            </div>
                        </div>
                    ))}
                </div>
            </nav>

        </header>
    )
}


