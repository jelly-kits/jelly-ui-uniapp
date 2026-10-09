/** 地址列表中的单条地址 */
export interface JeAddressItem {
  /** 唯一标识，删除 / 设默认时回传给调用方 */
  id?: string | number
  /** 收货人姓名 */
  name: string
  /** 联系电话 */
  tel: string
  /** 详细地址 */
  address: string
  /** 是否为默认地址 */
  isDefault?: boolean
  /** 姓名右侧的标签文案，如「家」「公司」 */
  tag?: string
}
