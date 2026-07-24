import type { Config, Context } from "@netlify/edge-functions";
import { getStore } from "@netlify/blobs";

const SESSION_COOKIE = "curso_session";
const ADMIN_COOKIE = "admin_session";
const AUTH_PATH = "/__auth";
const ADMIN_CLIENTS_PATH = "/admin/clientes";
const ADMIN_CLIENTS_API = "/__admin_clients";
const SESSION_HOURS = 16;
const ADMIN_SESSION_HOURS = 8;
const MAX_ATTEMPTS = 5;
const WINDOW_MINUTES = 10;
const RESERVED_SLUGS = ["admin", "auth"];
const DEFAULT_ACCENT = "#2E6BA6";
const EM_LOGO_DATA_URI =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAAC/CAIAAABPOcZ8AAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAA8KADAAQAAAABAAAAvwAAAAAPS+VTAAABZGlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNi4wLjAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iPgogICAgICAgICA8eG1wOkNyZWF0b3JUb29sPkFkb2JlIEltYWdlUmVhZHk8L3htcDpDcmVhdG9yVG9vbD4KICAgICAgPC9yZGY6RGVzY3JpcHRpb24+CiAgIDwvcmRmOlJERj4KPC94OnhtcG1ldGE+CgQ+9BsAACJ9SURBVHgB7V0JfFTVub8zc2ey7/u+khASSAiEfRMRFNGCWIWq3bRV69L2tfW93/PZ9tlq+2xfrbavtdY+cXnWHVc2UUBQCLKFLeyEJQQICSEJWWbu8v5nBm4mc+5MJpklM3PP+c0vuffcs37f/9zz3e985zs6btrPORYYBUKFAjyn04dKX1g/GAU4hmYGgpCiAAN0SLGTdYYBmmEgpCjAAB1S7GSdYYBmGAgpCjBAhxQ7WWcYoBkGQooCDNAhxU7WGQZohoGQogADdEixk3WGAZphIKQowAAdUuxknWGAZhgIKQowQIcUO1lnGKAZBkKKAgzQIcVO1hkGaIaBkKIAA3RIsZN1hgGaYSCkKMAAHVLsZJ1hgGYYCCkKMECHFDtZZxigGQZCigIM0CHFTtYZBmiGgZCiAAN0SLGTdYYBmmEgpCjAAB1S7GSdYYBmGAgpCjBAhxQ7WWcYoBkGQooCDNAhxU7WGQZohoGQogADdEixk3WGAZphIKQowAAdUuxknWGAZhgIKQowQIcUO1lnGKAZBkKKAgzQIcVO1hkGaIaBkKIAA3RIsZN1hgGaYSCkKMAAHVLsZJ1hgGYYCCkKMECHFDtZZxig/YsBWeYk2b9VuqxNkrhAao7Ltrr1kAHaLTJ5J5Esx0SFJcVHBgqmJTkjJc5oNHind4FRCgO0H/lgEaeOzv23O6dxZsGPtTqtSqfjfv/A3JzUWE6UnCYKtgeBCmiLyFmE4fz5QjAQpUmjsr9/07jU9Ljhx5BFmFCec/vs8vKCFE4IHUDzATgCDXp99ejMMCM/XNKdjuPqTzS3tHVxelx6L5j4aWNyYqPC7rq+8r+XbeAMJu8VPfiSZO6hW2oMet3MyvwPP907+PwBmiPwAC3JUZHG5U8syUqJGUaa3fLoG8vX7uXCvEcfSUpNjqkqzkCn7rt5/N/e29bZZfbygHGfXoJYUpS2cEYZckyvzNWHm8iE5NXB635bvJsyQEUOGdqAYQ3er16QqksykuIi0K3i7MRbZo0aTklakO7/2viocCMaMyo/JSc9noO6IyRCoAI6JIjbrxOSNGtsvhLz4C0TjBEmbljGrShlZCbcOXeMrTHREaYJZVmcICptC+qLAAV0UNNUtfH6MOOMMXnKo5qRmddNLB6el7RF+Pb8qmRoD6+GazDSvD8lXS3dv/8ZoNXpjQ9T9QdDixWlrPT4isIU+9wP3zpRx/tdByzJsYnR37tpnH1LplTk8JHDNF3Yt8Mb19776PFGa1yXcaSxdfv+Rs7gVag5qfLkuTZvfrEJ4oSRmTGRYfa1XTuuYMLo3Nq6Bs7oRy6Yha/PHleQEW/fktLcpMKsxEPHmzk+6D8M/UhKexIO6XrlliMPP/4OF+4XbRfWz7y4hCZzZFrvH3iD/qHFE2p3NfSP9uWdLIdFhT24qMahjnATP7k8+9Dhsxzvj5eFQ+3evQ0mQAMBXJjRm6o079LSWWmyjAkda4T084XTR5YWpx08dp7zj+xhFq6fPrJqRDrdEoy3l97fRscHXUzQj8ggoLgoF2QlluYm002F4uy+r43320KdnjdAcKebgZhJ5dlh0eHDo3VRbdBQIxmgh0o59/MJ4uRR2RFO1migPsvISvDHSrhZmDI2f2ZVvmrDCzOtQy74jToYoFX569VIHXdNtTqMUE1yXOS3b6jyj/4OIjvWulX7ZuT10HX4ba5QbYNXIhmgvUJG54XgOyw6HJ9czlNwUKLFJkX71qZUEMtLM26aUuqiGeSz1QncXeQKtEcM0D7miChBesaE7qIaKNFum13h25c01roX1jgTe2xtw3phVFxksIvRDNAukOaNR4I0tSIHE7rrsh5YVAOFmq/AJErZOUnfmFPhug25aXHl+UFvSjoAoV2TgD0dmAJ63TXVBQMmgyrt+sklvnpJW4S7bxybEEPsolwEvV43bUwuJwa3UQcDtAsWe/xIkqPjIieUZbpT0MO3TtB7cSlHqVKSE5Jj714wVolwcTELOhCD31fjXTRo8I8YoAdPM/dziBL2g+SkxrmTAwq1KcCT13dnmS1L5lS42YZxpRnxCVG+/Tx1hxYepGGA9oB4A2YVxelj8jCVD5gQCaBQg1rNnZSDSCPL4dERP6DWup2VkJEUM6YoLahNSRmgnTHXG/EGg70NtFJiQ1PbwVMtyq1yAbVaeWmmN/FkFhZMK60oSFWqUC6+3Huqu9dxry62zc6ozPPHKo/SDm9fMEB7m6JKeRBek6IxiSsRysXqrUd+/dLnyq1yAbXa/Qu9txIuY9ciD9FcKV+56OgyP/TMysYL7UqMcjGzKs+v1n9KxV66YID2EiHpYgSxqigtPTGafrJl3+m31u453nSRfgTlWnZuknfekRZhRnWBqlHUOxv279h2bBfM66gAfUtKckzwitEM0BRLvRUhSuRtR4Vei1hbf6a3vfu597dTDzko16BiI/4bPA867qFbJ+ohRvQPZov4p3e3Im7dzob+T8gdluLHlqR7U+yh6/BlDAO0z6hr4lUtgQ6fbjlyugVW3ctW7DzX2klXf/eN1VC0efqOtIiVZVnzJ42gy1+19ciOvafRgC/2nBLUrJFIs9Xi6aICMIYB2jdMEaX01NjK4jS69M17T1ku98KU/vzZthdX7qITwJXR0jmjPdXfSdIPFk0IoxTbkiz/8a1asiTJ6w+evHDsjIrYM2NMrg5258EZGKB9wzdBGleSobo4t37niSseMHj+b+9vvwRwU+H+RePDPbFOFqT8vBR4RaIK5jbtPrlh2zHy2afT9XR0b953mk4zuigtMy0AfDvRLXMjhgHaDSINIYncz2mBUkBXr6V2/+kr+1N4fUND8z/hzoYKULQtmF469Je0Rbjnpuo4GIdQ4Zm3aiUI6Da5WubWq4nRyDjeu9pDqhm+iwgmQBOBr9fij5/Hju3giwhLKjTb6k9cgBKaU7aUG/R/fncrrQ9GxocXT4TSjS5h4BhJTkqL+w5srKmw68jZj784yCnF8vrN+071qK1NzhqbF6SODYZEMopS/omYN6Ho5d8u1fl+1/dvXtm4/+i5oe/zE6WcrETiBJEKX+w+KXabOavLIvLQaNh38MwHXxykxYOpo3NmjCtYt+VIH/6o0tQjegXsgsmE6o0Kf35nay8kHKV2g+Ho6YtY4qnE6mD/ACslQ4SRfBk66kj6pwu8u2ACdElOEn5+oOFLK3ftV9PRuls1nBaUZcIjEZ1+/a6rArTdsz++tWXxzDKyBdguQN2Gl/S62qN2cW5cynJkXMR9WJ2hwtHGi29+tq/f8NBxQlcvdB00oEflpeRlJBzDcmb/VlGlBlxEPyIGXOuGqUGihyIHcVpQQLe9vat324Ezji9+E19bd3ItPtSocMOkEVC9cfAs7H7oFeCCcaTahtzn3t/WcbHTcU+KDmL0cbr4yHBjkPoHY4CmuelZjMwZo8IgMNCl7D12vhH+a6h3nixKeEnT/imhdIPh/yDcKEIXF258UM3C6Wxr50urdqmsafOGrfWNnZCCqED2QQahfzAGaIqTHkaIIrwQlWD5mgpQmUn4qKWDif9061Gsh9NPbptdDgWcu8scZmF2TdGkUVl0OS+u2NV8VmUsYXSdarq07/h5OsuU8hyMTF9toqHr81IMA7QKIenlYpVEzqIEaUp5driad68NRIBWIzhk2R7LM2+T5WiHAA3a926qdlfqMOiIvzxqrfvS5Z7nP9jO8erfS1Kv+fO6kw714nZETlJxtpesSujSfRaj3kmfVedRwSu2HPnrW1u86aFLrTn4rK/zRMWh42apOS1obe/efqjJqa+tMP79z+shk1QUOpp6wsnB029svtB2uU/Zp9ZsmH+Mq8idW1NIP3z9030NJ5qJ0ynVoNNv2NXws6VTHB5C4MFm9fqDlNDvkC7AboMJ0EcbWz9au8cfvu2wYuyeVb4jN2FQHxMBL0SO8dZBcq65nRagr6TEul1nD3TSz/10gUNeKODumDfmmVc2DtBxSX7wlhoj5VIMamYU62ow8PrtB5taO7oTqU2HGJn/u1xl3nBoYUDdqs2AAdVAu8b0+baDFyKf/oaGZjRVkEbmJRdmJNi1+srl55A3XNvQmfjX1+49jmUXKsBdWGSsSwcDglRUmHYrTgWgApTce6FaoYw6+hIa9Geb2+uOnOuLuXqFI44igPJh8cp+tQ2D/R9MgB5s34YhvSjB/thBo2xrxud1J1y9JpFIr7vU2vG3D1Q8JkINt3BmGUdtMOnroCDee/M4WvMtitKzb9f2JXN2ZRbIeKMCHIaU5iUHlzslBmiKjZ5EwGkB/A9R4dzFy3VH4Kx2oA3VRn7Zil1ITBWAE6smQCWnrkcTpdSM+G9eX0nn+mxnw5dAqrLWTaewxRiIGE0/xMgk+segMiVlgKb5ONQYSY6Jj1J1WrDjUFMLTJ8HlGQM+nNNF4FpugUTR2VBJadurmQWgOY07NamAlFvu3N4Cm/AdzB01VQB1hWiAZtNZxu+GAZo79FeFKGjyEqJpUskE7o7wEJO2JR+sK2dsimFMo54wjVQphVw/ZEQBXmDrhQrJp9sOcyZnCg37DPoda0tnTsONtnH2a5xFgxGqae7DehyfRbDAO090orSDJz5R6mBsQS4EQK0mw5ceP3xhubX1U7ChEpuPByEOqyEm4XF14wqzlLxnQfp2dJtcde6SBTXq0kd2amxxMoqeKQOBmjvAZo3EM9DVGi80LEHS3HUijeV8GqEntiU0ladUMk9uGhCv5clltkjTDgh7mrOvv8HTl5YvqF+EKcdGAwb605iP0tfEdYrjM/pQeUfjAHagYNDvYUVclI0jtak88MgqR3fee5LokbDngPEppQuavGssmKsvCjSi9kyd9IIYoxPhf9Z/lVXexe2pVBPnEQY9HuPnz91XsWxQXD5B2OAdsLgwUbDaUFxeqralxnZFTL4c1qxtQRKN4dWQDH3fYjLV8+a1xlwxITK6/n0+fbXVu92S3pWKtDrOi91bcUhY1SoLs2Ag5F+MwOVJnAiGKC9xAvitCCfLguWqJv2nHJXgFbym/jNdSc+3a5i2PktKDRwKBuwbhEmVubOVnNt+vePdrRiVdL9OcFWrySvUzMlhWsROBjpmxaURgbkBQO0d9iiC+NnwokWFU6cbauHHcVA/qGpfJwsSE9D6UY9wCRAVM7YNyVz8IVHL+K0tHf/46MdA+ueqZIh5X/pxLHBDDgYoaYLuoBAiGGA9gYXcHp2atwYNacF0J11XeoehCyrNMfEr609UqtmUwolHSxGRhSlLZw2UkmuXLy6Znfj6dZBfIMqOYljg5ajqo4NMFYHXJ1RyhnWCwZob5AfTgtKM+PheIAKRICmVAdUKrWIKzalKgvXRVmJN88YiW2w2FfikPNyj+Wv7301hAmBlEMMpLq37D3lUCZu8XmQBv364L8E6KJ8HcMA7Q0Ky7LqirdFEOHkc4jwQrusNqX7cGIxFZ783mxVH+bvbqg/eNiD7b2yun+wxNiIauIfzPEjlWrX8EcwQHvMAzj5DDeSwxyogH2phzzZZ6rTdXcQm1KqYA4v6VQs4PUPGD/PvlPLecJS3gDXM7QKHPUQ5R17Q/cneIjeSVJuRsIoHLdDBYCjt7NnKAK0UpSJ/+faPfiyVCJcXKzeenQbJgS1zTIucvV7ZNAfa2yFi7B+kdab6ZV5emwRoL9S6aTDGuPJcB7WhgdO5YIIyyEccky3iCwme4gA2JS2wKZUxU+pQ3VYYCdO6zzcr04cG5jh2MChcNxWFKRkpcUH/kuaAZrm3SBjiNOCfDoPJm6y73VAk1E6p0OMkccW1/NqNqX2CYHC9duOevR6thWnUxejYyLDYKgU+NroYAI02egPbSgkOT/83FRNyLIxOmyKmtMCqMAwfQ9FfWaPU1xjR8mZ1pdW1TlEO9z+8e1aETsA3F7qdsjed0scG5xRdWxAjtfwcMLpq8ZXV8G0pzAq3ESUR2qTu3fJA1Rc7OzpdQcfolRckFqC3dFUgH4D07d3WsvzcBNz79fGxUaq+F9EzbuPnvt404FBmCJRre2LMOhPn23Ddl16Z+S0MTl8hEmAVOP5sOmrz8tXwQTo268tXzBlhEffWO5RD/y664nlK2CtNuBqgtVpgUltxx7RQHuL8bz+2PHzb3y6j7g0UAvEOq/TzmmdWhr34+DYYOPukzSgsRMsPyvhSMOFoSsi3W/EUFMGE6DDTTx+Q+3p4PIRV+HuTK869YNiL3ebtx5o9IIArbTaalN617wxNAVwVssbsJ/2ImX0eoxG2rFBRJgRn79HsJ128Cv5Sj98fRFMMrSvaWFfvlsitCxHxEZga7R9Rtv1/obmk9i/rbjNpVMMNsZo2F3f+NGXh+h88Jre3joY81S6CIcYODY41ARHIg7RuCU++7w17dCleyOGAdoDKgpSWV5yfrrKQbGwsJN6zF7nPRRzDjal2FG7DOdaqMk8Q++YXg8XImRXLxXgesYUFT7ExXyqNF9EBCigaYcpvui8izLpnVQqiclBsbkGta0oVgHa268yE//lrobPdjTYtwSef89hKlBrg32yQV+bReK4jArF2YlwERbIlnd+EkkpyriKgA3xzsNN6YlRbs37rkoa4jPsSIUnoQG/PmFfP3/yCLoOaKC3+8aDFmxKsZH7uqv+vrCX9jnitG4g7wh0EweMMeg2YB8kFUy8YXZ1/r56r34eULV4EhF4gNbrLveYb3zkNW+/3wZHJaLzNrkEitWEA68xiMsORTc2d5xp6fD+WxPVmPg1tYdr9zfi4wx3b3y27zh2KzpzWufQrEHdGg1wvfCbVzfhcFuHfMTbQQB/FOq46b90aHFA3LqjYfBpQ90cT9BV0/MI8voCZLb+9liWLqh+7ee39JqFCfe+sNu1my9PSIR+qfpqgnjjXZHdk0ZSeR3HH5VgmCLcxNMwta6vWuoF1vfIR1dh/Hsb6hvOtmExBXoPb2rrHBqMDba+X8NyqNPzWwOXN8vzUlgJ/qOATid09/ZI0qrao8F4BoqvCRWoIoev+x3k5eOzlUj5LFAUCFC1HdVOFtGPArKHZqL9CgupGwbo4GRnsHxj+J26DNB+Jzmr0JcUYID2JXVZ2X6nQMADGl8+g/r4IendzuCQ0uHW78xQrxCtcqdDQ2v80HKpNzQgYgMY0HBJaBaMRoMeLq1wvN+An0FI0Gsx8PoIaE+teQcksMl+Pyk8eRoNAzg3VNiP8l0fmII9NQOiEAkG3EdNWsXzWJlzWRpIRPqikAgXyrUzKsD3kiiZYHRqpZvr8onxhm1coRkuW+KsNr/FB+rCilmoKsv64W2TsFkfBMQGit+9tqkF++qc2S0IYnJC1L8snVKeT45F6+wxv7yybjUceLqwEhbEB26b9PKqupZLVi+dkvTQ4skvrth5EWaTqri2CI9+95qasiws0fVYBBzws3LTQfU1M0F69Luz3ly39zBs4Z2ZDYlSaX7KkjkV//nCOqdp0JNeyz2Lxrd3mf/vw+0uVh8Net1j35rx1GtfdMBTuiAumlOB3T2vunAIZhFvvW70kjmjI028WZRWbTn8/PvbyBBQ7bgk//aBudkpsQKGsU6HA+b+44V1PXjFqCb2G3KdVBSQgLaIU8bm/+nH8596dRPM1mBOcMe8yvd+s3TpL946TXwQUrOKJKUmRr/569tXbD70g999eLnXMrog9Vf3zoGz7n8s/0od0zhF2MTfv3B8U0vn6yt2Ypxkpcf/6zemrvnq6EVnw0biygtTXl5dt3lnQ2pS9NM/nH+hreurffAjQ5l8yDL86q7ZesSV8CPL8LQEf0uu04RFhX1zXiUOCX99dZ2LI78tZnHB1JKU+Kj7nlzOSVxBRgJx4+TsJW0WfnznNJhV/eL5zw6fbs1Miv7ZXdPHjcx84KkPzQTTKkgZOyL9yVc21h8jXq5hOtYLp+sBiWY0nQKHSnf8GwWoGQ0//86sn/7lkzc+3gl734amtiee//QPb25OSYpRn+8s4k/vmPbJtqNP/f2zxpbOtsu9G3ccX/LLt+9eUJ2Rjp33anOkKOVnJmAn823XlOuASLPw9WtGhZn46hEZLvwDWQSp8UJ7U1Nb3fbjtfWna2Ah5MSZEHy+0M7DHeiIBEjmENnvFjCdVgrnHsfPtM0aX6h+wIotg06HkTmzKu/Om8ZxvWbYTKP+fkUpN6JUlJ+CA+C+/uibOE+oub2r7vDZu371LnzwRcc6PcHNbBFPnLt0vrEVv5ZzlwJ5TSfwAC1JmWnxmEPX7TjOYU8oBGjM2hGm5Wv37oTpguoMbjKOKUrDljskI+nx8ggznj1NHKbAt7H6zntRnFyeg5MfJFkaOyqLjwybO77w8WXrVQ+dV8CAC4g0VaOy5t9QNaMybz1aSL+e7VN7dq3j9bdfW4FTjZet2nXXPJVDrvqKhz8NQbr/Dx/DH2nJqGxIRH2PHK4EcXJFDnywt11oJ5tqQSujAeLx39+ubYXopeqBV5bh4/Qnt09+7IG5j91/3d2LVTxSO1QyjLeBJ3LAVkEUQUH8iNBmmwJt4p0qmkE8ibyQiOdCvIyV+V+H4WDsJju31SZRmcMh759sO4YtektmV6TERZ2+0PHK6j2wYsOJ7XgTq828MgpaPLNs6qjsLovwo2dX7cfuOt/ZnVnEmspcnBSYGB3O84aq4rTS4vSDx5z6rTPyergde+yFdc/+5EacUYQJQh1VOl2vRcDuwH5PgWjQVpVQSGddZodwYt1UprvY0dMvb4DdBN4bWq9rOtt2vu3yd+ZXcfjEgbgGUArir++/jngUdzgyx0ZNQVy55fBPlkwm8igSI83l3hmTRqQlRW8lMq5KH/XhRmy+wCEMH206WFmc9u93TcPXYXNzO3BQkJngRPmgA0YeX7bh7l++/dB/ffAVcbqljB4VrmKaJkKCaoNVklNRkvTd+WMPnLhw09SSG2oKgSdCEJciCgbwmvX71+1oeGTpFHy5qusjeMOGnQ3o8qiybK7LSt5uc1J85F8euZkcP+BkGIAs72868N7KXe+tqtuwWWVfI9X6YYsIvDc0+KDTPfLnNa/8YnFRZsKaLUfw6r3j+kq8g7fvhyMiFXTis+/55V9B6nj9ySX/XL370uWeieXZC2eU/eiZlZ3Y3E/DTpQKcpPxljrR1Gbp7MFJ1/MmFH0Bt12CiB3UUypyDmE7ndpsEGbkicE7NCd0mfYclDkkmzexuCAtrtsi4vRLh42AtrTQtdFbuK8UI0plJZmjC1NnPvCiANjJckxSzCdPfzMnJ/nUOfW9tyiKbBsL43//ykZsKqE97V4pWa87f7798Rc3vPTowmUf79x79FxeRvw9N497b+OB5uYOdfJyHEqbW1N0LD0B58p1m4XafY3igApHe4L48TogzUfh0K29a/nGA8XZSXNqigqzEvECfuKlz82QBFSFPJ1OkmS8a7stwuzxhWNLMy+0d/3H858ewG4Oe02zQlZZToqLxKaSOpzMx+tPt3TsOnLuMLzW8vpWKPws4lF4PKJ1KfiCNuj2NVxow5yr2gylfHLaoAEzQF5GAhzRwiEYATQ1oet0ejgoglkz/QhTxIi85J2HztbjKcQDI2/uNnf0WqDAOdesfoAnhseuw+eANtgtbdxzEt9th062qA5LRB4+dn7jnlNTK/NmVOXHRoc/8/aWt9bscTpKrRr6EdlJhdmJOD8OL/La+kbVHtkRYNguA9h8FNMf5k2bAAw0AJpqwnA/yiE9ciEZhANsoFID5ZX0SIbp26alti0Z2DBqm9OdfepBfsCbeyA0kypsLcEFGuMgsF5pAUR/uzYokcoFcXoGKNlJNSgTE5SzTuEpEtuGjY0I1BBSyiYXKB/dQRqbAG1fUb901hulO7hz0SM6o99jAlHkuEIE4GawOyZcLKM4UBaFK4nBVGWoOIOyLbtrrttXoRRuH+lwbd8Gh0e4xcixAzN57rpM+6fuDDlSvpr8RrdkwKpVswxTpNtdGqb2sWoZBQZFAQboQZGLJQ50CmgS0BCUlYU0myipsAlipfKIyNZ2Vj74JFXWBSGkIiWe2oL9Jz+yK8o1JLBPptSC7Epeh0g8UoLSEsTYtxNJkMxZSvt2KhntSlWKD8kLLQK6oiQDOgTy4Qitc3bSjPGF5LQ/LLkb9JOr8kYWpmK/HgAXFxMRFRmWGBdJwCfLZUWpeERAIMmInDAmNwoLk3gkyTiSgpRgfVSYkzS6NBMrnYiHAqFmdE6Cw5KyJENBHmnLS/JYgySnJEbBThAmVsiIKOjg8rISSPkIklySnzJ5bL7VhaRsMhnQtsT4yCvunWQuTzm8XpZHl6RXlKQTnbk1Y3Fu8tTq/DB8IttirNEh/EdzgAby4HA/NgKOlsFhqLy5zKQYCV/xWBMuz4b6L9xoIKaYFqkiP2Xh9JE1ZZl4y2JT6qyxBXG2g9tgDpGViEXyikKcryrBvvXbN1SR5Ri8RCVp4qhs2FTATggFFmYmjB2RwRNNgh2ERBE2SWkJ0VfAansiSkuurVg0veyWmWXkBY+DD5Oi77mxmizp4To5Bk702tu7E2IiAO6YSBMaNn/SCGJYS4ZNGNzsJmHYSLLBYCjNTUbhZTjzxSJi5JQXpGBtDwv1ffOGXVtC71JzgAaMEIAxEnS69ss9Zy92AsdQdGDFGysI4UTLRm5FWe6GXRl5RFIjl6I8QATW8OoOnUGykQUpXT0WLE3bXopIE27kL1ltUG1CAQaDtbK+P1AVI/Tdc1x4VBi8feZnxF/q7IFTcUATViiwsiKHeYoSlL4Yh9GRJqUgaMvJSiSCKMGg6mJHN+z7cI2pBGvg4SYDMXuyGnjo9fq4qDCrfZx9hSF7HcB6aJ/RHC9OQOTE2UtgOYCCt2DHZXJWFeBSXpB6qav3lPXUKUgUQAgSdGKtjuOwSoIpHkuJgHZkuAkO7CSr6IzZv72zJy4m/FJnL2CK8+UBKUAci8+QK/LT42HyigS2UUH6BMPRmAgYmZDV6asIRS0YS7gDzOFbGvUmxkTAv15CTDixz5bl7LT4+JjwAw3NgijD3h+yB9qLYzZlSYJIc7G9x/oXDnBlrEZhGe9440WiL5fk9JQYWKrsO35+QOs/n9HbrwVrEdB4kxEaK1pYvCyVlyhZjIQAa524lJeo7al9LvLoqvbado2/thc4LshD61NcIxcqUsq3MdeW5SqarzCcRFqDLTHetigQkVduIc9gBfLqjGpLbHtkS2NLjwLs24lbxOOnZLRVEbp/A3hhxXdEV6Bsq8IebfaMt49HSvtc9o9s10oMLhSk4lp1pUZJbN9Hh0jb8FAiMcaugplkUuKVa1t63Nq3E7eIVx7hNtSDPZFCva+sfxqgAAO0BpispS4yQGuJ2xroKwO0BpispS4yQGuJ2xroKwO0BpispS4yQGuJ2xroKwO0BpispS4yQGuJ2xroKwO0BpispS4yQGuJ2xroKwO0BpispS4yQGuJ2xroKwO0BpispS4yQGuJ2xroKwO0BpispS4yQGuJ2xroKwO0BpispS4yQGuJ2xroKwO0BpispS4yQGuJ2xroKwO0BpispS4yQGuJ2xroKwO0BpispS4yQGuJ2xroKwO0BpispS4yQGuJ2xroKwO0BpispS4yQGuJ2xroKwO0BpispS4yQGuJ2xroKwO0BpispS4yQGuJ2xroKwO0BpispS4yQGuJ2xroKwO0BpispS4yQGuJ2xroKwO0BpispS4yQGuJ2xroKwO0BpispS4yQGuJ2xroKwO0BpispS4yQGuJ2xroKwO0BpispS4yQGuJ2xroKwO0BpispS7ynCxpqb+sryFOgf8HEjSW5o8f+NUAAAAASUVORK5CYII=";

interface ClientRecord {
  password: string;
  displayName?: string;
  logo?: string;
  color?: string;
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function b64url(bytes: Uint8Array): string {
  let str = "";
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str: string): Uint8Array {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  const bin = atob(str);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function signToken(payload: Record<string, unknown>, secret: string): Promise<string> {
  const payloadB64 = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  return `${payloadB64}.${b64url(new Uint8Array(sig))}`;
}

async function verifyToken(token: string, secret: string): Promise<Record<string, unknown> | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  const key = await hmacKey(secret);
  const expectedSig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  if (b64url(new Uint8Array(expectedSig)) !== sigB64) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(payloadB64)));
    if (typeof payload.exp !== "number" || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function safeRedirect(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

function clientSlugFor(pathname: string): string {
  const seg = pathname.split("/").filter(Boolean)[0];
  if (!seg || RESERVED_SLUGS.includes(seg) || seg.startsWith("__")) return "default";
  return seg;
}

function passwordStore() {
  return getStore({ name: "client-passwords", consistency: "strong" });
}

function rateLimitStore() {
  return getStore({ name: "rate-limit", consistency: "strong" });
}

function parseClientRecord(raw: string | null): ClientRecord | null {
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.password === "string") return parsed as ClientRecord;
  } catch {
    // legacy value: a plain-text password with no extra fields
  }
  return { password: raw };
}

async function getClientRecord(scope: string): Promise<ClientRecord | null> {
  return parseClientRecord(await passwordStore().get(scope));
}

async function isRateLimited(ip: string, scope: string): Promise<boolean> {
  const raw = await rateLimitStore().get(`${ip}:${scope}`);
  if (!raw) return false;
  const data = JSON.parse(raw);
  const windowStart = Date.now() - WINDOW_MINUTES * 60 * 1000;
  return data.first >= windowStart && data.count >= MAX_ATTEMPTS;
}

async function recordFailure(ip: string, scope: string): Promise<void> {
  const store = rateLimitStore();
  const key = `${ip}:${scope}`;
  const raw = await store.get(key);
  const now = Date.now();
  const windowStart = now - WINDOW_MINUTES * 60 * 1000;
  const data = raw && JSON.parse(raw).first >= windowStart ? JSON.parse(raw) : { first: now, count: 0 };
  data.count += 1;
  await store.set(key, JSON.stringify(data));
}

async function clearFailures(ip: string, scope: string): Promise<void> {
  await rateLimitStore().delete(`${ip}:${scope}`);
}

function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function brandBlockHtml(brand?: ClientRecord | null): string {
  if (brand?.logo) {
    return `<div class="brand-logo"><img class="logo" src="${esc(brand.logo)}" alt="${esc(brand.displayName || "Logo")}"></div>`;
  }
  if (brand?.displayName) {
    const color = brand.color && /^#[0-9a-fA-F]{6}$/.test(brand.color) ? brand.color : DEFAULT_ACCENT;
    return `<div class="brand-row"><div class="badge" style="background:${esc(color)};">${esc(initialsFor(brand.displayName))}</div><div class="name">${esc(brand.displayName)}</div></div>`;
  }
  return `<div class="brand-logo"><img class="logo" src="${EM_LOGO_DATA_URI}" alt="EM Compliance"><div class="tagline">Plataforma de e-learning</div></div>`;
}

function pageShellHtml(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap" rel="stylesheet">
<style>
  body{font-family:'IBM Plex Sans',Arial,Helvetica,sans-serif;background:#EFEDE4;color:#0B1F33;margin:0;padding:24px;min-height:100vh;box-sizing:border-box;}
  .wrap{max-width:420px;margin:56px auto;}
  .card{background:#FFFFFF;border:1px solid rgba(11,31,51,0.12);padding:34px 30px;border-radius:14px;margin-bottom:16px;}
  .brand-logo{margin-bottom:24px;}
  .brand-logo img.logo{height:42px;display:block;margin-bottom:8px;}
  .brand-logo .tagline{font-size:11.5px;color:#5C6B7A;}
  .brand-row{display:flex;align-items:center;gap:10px;margin-bottom:24px;}
  .brand-row .badge{width:32px;height:32px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-family:'IBM Plex Mono',monospace;font-weight:600;font-size:11px;color:#fff;flex-shrink:0;}
  .brand-row .name{font-size:13px;font-weight:600;color:#0B1F33;}
  .eyebrow{font-family:'IBM Plex Mono',monospace;font-size:10.5px;font-weight:600;letter-spacing:1.3px;text-transform:uppercase;color:${DEFAULT_ACCENT};margin-bottom:8px;}
  h1{font-size:19px;font-weight:600;margin:0 0 8px;color:#0B1F33;letter-spacing:-.2px;}
  p.sub{font-size:13.5px;line-height:1.6;color:#33475A;margin:0 0 22px;}
  label{display:block;font-size:11.5px;font-weight:600;color:#5C6B7A;margin-bottom:6px;}
  input[type=password],input[type=text]{width:100%;box-sizing:border-box;padding:11px 13px;border-radius:8px;border:1px solid rgba(11,31,51,0.22);background:#FAF9F5;color:#0B1F33;font-size:14.5px;font-family:inherit;margin-bottom:14px;}
  button{width:100%;padding:12px;border-radius:8px;border:none;background:${DEFAULT_ACCENT};color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;}
  .err{color:#B0342F;font-size:13px;margin-bottom:14px;}
  .ok{color:#2E8B57;font-size:13px;margin-bottom:14px;}
  .footnote{display:flex;align-items:center;gap:6px;margin-top:22px;padding-top:18px;border-top:1px solid rgba(11,31,51,0.12);font-size:10.5px;color:#5C6B7A;font-family:'IBM Plex Mono',monospace;letter-spacing:.3px;}
  a{color:${DEFAULT_ACCENT};}
  .muted{color:#5C6B7A;font-size:13px;}
  .client-row{background:#FAF9F5;border:1px solid rgba(11,31,51,0.12);border-radius:10px;padding:16px;margin-bottom:12px;}
  .client-row-head{display:flex;align-items:center;gap:8px;margin-bottom:12px;font-size:13px;}
  .client-row-head .slug{font-family:'IBM Plex Mono',monospace;font-weight:600;}
  .client-row-head .dname{color:#5C6B7A;}
  .client-form{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;}
  .client-form input[type=password],.client-form input[type=text]{margin-bottom:0;}
  .client-form input[type=color]{padding:2px;height:40px;border-radius:8px;border:1px solid rgba(11,31,51,0.22);}
  .client-form input[type=file]{font-size:12px;padding:8px 0;}
  .client-form button{grid-column:1 / -1;width:auto;padding:9px 18px;justify-self:start;}
  button.danger{background:#B0342F;width:auto;padding:8px 16px;font-size:13px;}
  .create-form{display:flex;flex-direction:column;gap:10px;}
</style></head>
<body><div class="wrap">${body}</div></body></html>`;
}

function pageShell(title: string, body: string): Response {
  return new Response(pageShellHtml(title, body), { headers: { "content-type": "text/html; charset=utf-8" } });
}

function loginPage(opts: { title: string; error?: string; action: string; hiddenScope: string; brand?: ClientRecord | null }): Response {
  const body = `<div class="card">
${brandBlockHtml(opts.brand)}
<div class="eyebrow">Acceso protegido</div>
<form method="POST" action="${esc(opts.action)}">
  <h1>${esc(opts.title)}</h1>
  ${opts.error ? `<div class="err">${esc(opts.error)}</div>` : ""}
  <input type="hidden" name="scope" value="${esc(opts.hiddenScope)}">
  <input type="password" name="password" placeholder="Contraseña" autofocus required>
  <button type="submit">Entrar</button>
</form>
<div class="footnote"><i>&#128274;</i> Conexión cifrada &middot; HTTPS</div>
</div>`;
  return new Response(pageShellHtml(opts.title, body), {
    status: 401,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

async function clientsManagementPage(message?: { ok?: string; err?: string }): Promise<Response> {
  const store = passwordStore();
  const list = await store.list();
  const entries = await Promise.all(
    list.blobs.map(async (b) => ({ slug: b.key, record: parseClientRecord(await store.get(b.key)) })),
  );

  const rows =
    entries
      .map(({ slug, record }) => {
        const s = esc(slug);
        const currentName = record?.displayName || "";
        const currentColor = record?.color && /^#[0-9a-fA-F]{6}$/.test(record.color) ? record.color : DEFAULT_ACCENT;
        const logoPreview = record?.logo ? `<img src="${esc(record.logo)}" alt="" style="height:20px;border-radius:4px;">` : "";
        return `<div class="client-row">
          <div class="client-row-head">${logoPreview}<span class="slug">${s}</span>${currentName ? `<span class="dname">${esc(currentName)}</span>` : ""}</div>
          <form method="POST" action="${ADMIN_CLIENTS_API}" class="client-form" onsubmit="return prepLogo(this)">
            <input type="hidden" name="action" value="update">
            <input type="hidden" name="slug" value="${s}">
            <input type="hidden" name="logo" class="logo-data">
            <input type="password" name="password" placeholder="Nueva contraseña (opcional)">
            <input type="text" name="displayName" placeholder="Nombre para mostrar" value="${esc(currentName)}">
            <input type="color" name="color" value="${currentColor}" title="Color de la insignia">
            <input type="file" accept="image/*" class="logo-file" title="Logo (opcional)">
            <button type="submit">Guardar</button>
          </form>
          <form method="POST" action="${ADMIN_CLIENTS_API}" onsubmit="return confirm('¿Eliminar este cliente?');">
            <input type="hidden" name="action" value="delete">
            <input type="hidden" name="slug" value="${s}">
            <button type="submit" class="danger">Eliminar</button>
          </form>
        </div>`;
      })
      .join("") || `<p class="muted">Todavía no hay ningún cliente configurado.</p>`;

  const body = `
  <div class="card">
    <h1>Panel de administrador — Clientes</h1>
    ${message?.ok ? `<div class="ok">${esc(message.ok)}</div>` : ""}
    ${message?.err ? `<div class="err">${esc(message.err)}</div>` : ""}
    <p class="muted">Cada fila es un cliente. El nombre (slug) define la carpeta pública, ej: <code>cliente-a</code> corresponde a <code>curso.emcomplianceuy.com/cliente-a/</code>. La carpeta "default" es la raíz del sitio. El nombre para mostrar, el logo y el color son opcionales — si no los cargás, esa pantalla de acceso queda genérica.</p>
    ${rows}
  </div>
  <div class="card">
    <h1>Agregar cliente nuevo</h1>
    <form method="POST" action="${ADMIN_CLIENTS_API}" class="create-form" onsubmit="return prepLogo(this)">
      <input type="hidden" name="action" value="create">
      <input type="hidden" name="logo" class="logo-data">
      <input type="text" name="slug" placeholder="nombre-cliente (solo letras, números y guiones)" pattern="[a-z0-9-]{1,40}" required>
      <input type="password" name="password" placeholder="Contraseña para este cliente" required>
      <input type="text" name="displayName" placeholder="Nombre para mostrar (opcional)">
      <label style="margin-bottom:-4px;">Color de la insignia (opcional)</label>
      <input type="color" name="color" value="${DEFAULT_ACCENT}">
      <label style="margin-bottom:-4px;">Logo (opcional)</label>
      <input type="file" accept="image/*" class="logo-file">
      <button type="submit">Crear</button>
    </form>
  </div>
  <p><a href="/admin">&larr; Volver al curso (modo admin)</a></p>
  <script>
    function prepLogo(form) {
      var fileInput = form.querySelector('.logo-file');
      var hidden = form.querySelector('.logo-data');
      if (fileInput && fileInput.files && fileInput.files[0]) {
        var reader = new FileReader();
        reader.onload = function () {
          hidden.value = reader.result;
          form.submit();
        };
        reader.readAsDataURL(fileInput.files[0]);
        return false;
      }
      return true;
    }
  </script>`;
  return pageShell("Panel de administrador — Clientes", body);
}

export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const SESSION_SECRET = Netlify.env.get("SESSION_SECRET") || "";
  const ADMIN_PASSWORD = Netlify.env.get("ADMIN_PASSWORD") || "";
  const ip = context.ip || "0.0.0.0";

  async function validAdminSession(): Promise<boolean> {
    const cookie = context.cookies.get(ADMIN_COOKIE);
    if (!cookie) return false;
    const payload = await verifyToken(cookie, SESSION_SECRET);
    return !!payload && payload.scope === "admin";
  }

  // --- Login form submission ---
  if (url.pathname === AUTH_PATH && req.method === "POST") {
    const form = await req.formData();
    const password = String(form.get("password") || "");
    const scope = String(form.get("scope") || "default");
    const isAdmin = scope === "admin";
    const redirectTo = safeRedirect(url.searchParams.get("redirect"));
    const record = isAdmin ? null : await getClientRecord(scope);

    if (await isRateLimited(ip, scope)) {
      return loginPage({
        title: isAdmin ? "Panel de administrador" : "Acceso al curso",
        error: "Demasiados intentos fallidos. Probá de nuevo en unos minutos.",
        action: `${AUTH_PATH}?redirect=${encodeURIComponent(redirectTo)}`,
        hiddenScope: scope,
        brand: record,
      });
    }

    const ok = isAdmin
      ? ADMIN_PASSWORD.length > 0 && password === ADMIN_PASSWORD
      : record !== null && password === record.password;

    if (!ok) {
      await recordFailure(ip, scope);
      return loginPage({
        title: isAdmin ? "Panel de administrador" : "Acceso al curso",
        error: isAdmin || record !== null
          ? "Contraseña incorrecta."
          : "Este curso todavía no tiene una contraseña configurada. Contactá al administrador.",
        action: `${AUTH_PATH}?redirect=${encodeURIComponent(redirectTo)}`,
        hiddenScope: scope,
        brand: record,
      });
    }

    await clearFailures(ip, scope);
    const hours = isAdmin ? ADMIN_SESSION_HOURS : SESSION_HOURS;
    const token = await signToken({ scope, exp: Date.now() + hours * 60 * 60 * 1000 }, SESSION_SECRET);
    const res = new Response(null, { status: 302, headers: { location: redirectTo } });
    res.headers.append(
      "set-cookie",
      `${isAdmin ? ADMIN_COOKIE : SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${hours * 3600}`,
    );
    return res;
  }

  // --- Admin-only: client management UI + API ---
  if (url.pathname === ADMIN_CLIENTS_PATH || url.pathname === ADMIN_CLIENTS_API) {
    if (!(await validAdminSession())) {
      return loginPage({
        title: "Panel de administrador",
        action: `${AUTH_PATH}?redirect=${encodeURIComponent(url.pathname)}`,
        hiddenScope: "admin",
      });
    }

    if (url.pathname === ADMIN_CLIENTS_API && req.method === "POST") {
      const form = await req.formData();
      const action = String(form.get("action") || "");
      const slug = String(form.get("slug") || "").toLowerCase().trim();
      const password = String(form.get("password") || "");
      const displayName = String(form.get("displayName") || "").trim();
      const logo = String(form.get("logo") || "").trim();
      const color = String(form.get("color") || "").trim();
      const validSlug = /^[a-z0-9-]{1,40}$/.test(slug) && !RESERVED_SLUGS.includes(slug);

      let message: { ok?: string; err?: string } = {};
      if (!validSlug) {
        message = { err: "Nombre de cliente inválido (solo letras minúsculas, números y guiones)." };
      } else if (action === "delete") {
        await passwordStore().delete(slug);
        message = { ok: `Cliente "${slug}" eliminado.` };
      } else if (action === "create" || action === "update") {
        const existing = action === "update" ? await getClientRecord(slug) : null;
        const finalPassword = password.length > 0 ? password : existing?.password || "";
        if (finalPassword.length === 0) {
          message = { err: "Falta la contraseña." };
        } else {
          const record: ClientRecord = { password: finalPassword };
          const finalName = displayName.length > 0 ? displayName : existing?.displayName;
          const finalLogo = logo.length > 0 ? logo : existing?.logo;
          const finalColor = color.length > 0 ? color : existing?.color;
          if (finalName) record.displayName = finalName;
          if (finalLogo) record.logo = finalLogo;
          if (finalColor) record.color = finalColor;
          await passwordStore().set(slug, JSON.stringify(record));
          message = { ok: `Datos de "${slug}" guardados.` };
        }
      } else {
        message = { err: "Faltan datos." };
      }
      return clientsManagementPage(message);
    }

    return clientsManagementPage();
  }

  // --- /admin: unlock the in-page admin panel of the course itself ---
  if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) {
    if (!(await validAdminSession())) {
      return loginPage({
        title: "Panel de administrador",
        action: `${AUTH_PATH}?redirect=${encodeURIComponent(url.pathname)}`,
        hiddenScope: "admin",
      });
    }
    const rewritten = new URL(req.url);
    rewritten.pathname = "/index.html";
    const response = await context.next(new Request(rewritten.toString(), { headers: req.headers }));
    return injectFlag(response, true);
  }

  // --- Everything else: gate by the general client password for this path's slug ---
  const scope = clientSlugFor(url.pathname);
  const sessionCookie = context.cookies.get(SESSION_COOKIE);
  const payload = sessionCookie ? await verifyToken(sessionCookie, SESSION_SECRET) : null;
  const hasValidSession = payload && payload.scope === scope;

  if (!hasValidSession) {
    const record = await getClientRecord(scope);
    return loginPage({
      title: "Acceso al curso",
      action: `${AUTH_PATH}?redirect=${encodeURIComponent(url.pathname)}`,
      hiddenScope: scope,
      brand: record,
    });
  }

  const response = await context.next();
  return injectFlag(response, false);
};

async function injectFlag(response: Response, adminUnlocked: boolean): Promise<Response> {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return response;
  const html = await response.text();
  const flagScript = `<script>window.__ADMIN_UNLOCKED__=${adminUnlocked};</script>`;
  const injected = html.includes("</head>") ? html.replace("</head>", `${flagScript}</head>`) : flagScript + html;
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(injected, { status: response.status, statusText: response.statusText, headers });
}

export const config: Config = {
  path: "/*",
};
