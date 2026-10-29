import { useCurrentPath } from "../../utils/navigation"
import { AdminGuard } from "../AdminGuard"
import { AdminLayout } from "./AdminLayout"
import { AdminOverview } from "./AdminOverview"
import { AdminScheduleMatrix } from "./AdminScheduleMatrix"
import { AdminOrders } from "./AdminOrders"
import { AdminMenuCrud } from "./AdminMenuCrud"
import { AdminUsers } from "./AdminUsers"

export function AdminPortal() {
  const currentPath = useCurrentPath()

  const renderActiveView = () => {
    if (currentPath.startsWith("/admin/schedule")) {
      return <AdminScheduleMatrix />
    }
    if (currentPath.startsWith("/admin/orders")) {
      return <AdminOrders />
    }
    if (currentPath.startsWith("/admin/menu")) {
      return <AdminMenuCrud />
    }
    if (currentPath.startsWith("/admin/users")) {
      return <AdminUsers />
    }
    return <AdminOverview />
  }

  return (
    <AdminGuard>
      <AdminLayout>{renderActiveView()}</AdminLayout>
    </AdminGuard>
  )
}
