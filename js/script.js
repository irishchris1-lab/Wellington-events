// Inline PWA manifest — no manifest.json file required
  const _manifest = "{\"name\": \"What's On Wellington\", \"short_name\": \"Welly Events\", \"description\": \"Family-friendly events, caf\\u00e9s, walks and playgrounds across Wellington every weekend.\", \"start_url\": \"/Wellington-events/\", \"display\": \"standalone\", \"background_color\": \"#F7F2EB\", \"theme_color\": \"#0B5563\", \"orientation\": \"portrait-primary\", \"icons\": [{\"src\": \"data:image/png;base64,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\", \"sizes\": \"192x192\", \"type\": \"image/png\", \"purpose\": \"any maskable\"}, {\"src\": \"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAgAAAAIACAYAAAD0eNT6AAArQUlEQVR42u3dOXBc15of8O7GDhAECYJYuVPvkZK4iKRA2YkTZ3Zgu1yvbAeOJrDLVQ4cOXA4mUPXpK8cOHHVy1x24CqnMyMKXMBFFCmS2IjGToDEjga624HEJz2KC5YG+txzf79o5s0bCffevuf7n++ce282w4Fq+cNflZ0FgN9a+dMfs87CwXGyFXkA4UAAQLEHEAoEABR8AIFAAFD0ARAGBAAFHwCBQABQ+AEQBAQARR8AYUAAUPgBEAQEAIUfAEFAAFD0ARAGBACFHwBBYF/lFH8ASF8tybpYAJC+bkA0B6PwAyAIpCgAKPwACAI7l+g9AIo/AGpQijoACj8AugEp6wAo/gCoTSkLAIo/AGpUZWSdVACorCQsCQTfAVD8AdANSFkAUPwBEAL2R9ZJA4D9FeKSQHAdAMUfAN2AlAUAxR8AISBlAUDxB0AISFkAUPwBEAJSFgAUfwCEgJQFAMUfACEgZQFA8QdACKheLcyl7YABQAioQgBQ/AGg+rUxF/sBAoAQUMUAoPgDQDi1MhfbAQGAEBBAAFD8ASC82plL+gEAgBAQYAcAAAjPvgUAs38ACLeW5pL2BwOAEBBgAFD8ASD82moPAACkUEUDgNk/ACSjC5AL9Q8DAPav1uZC+4MAgP2vufYAAEAK7TkAmP0DQPK6ALlq/wEAwMHXYEsAAJBCuw4AZv8AkNwugA4AAOgAmP0DQBq6ADoAAKADYPYPAGnoAuT2+18AAIQXAiwBAEAKbTsAmP0DQDxdAB0AANABAAAEgJ9p/wNAMmy3ZusAAIAOgNk/AKShC6ADAAA6AGb/AJCGLoAOAADoAAAAqQ4A2v8AkGwfq+U6AACgA2D2DwBp6ALoAACADgAAIAAAAFHKvvsfWP+HZGrrb7lxUP+uNwMrd5xxSJaVP/3xL2p+rVMCCvt+/U2CAoRLAABFvirHJRxAdf1FO0D7HxT7ahIKYH/9ehlABwAU+6DPl1AA+0MAAAU/UedUIAABABR851wggF3681qA9X9Q9JNOGIBPe7sPQAcAFHzdAUghAQAU/VRcR2EABABQ9IUBYQABwClAYVD403rNBQHSLJvJ2ACIog/CAGmy8qc/ZnUAUPhBV4AUEgBQ9OEDvxdhAAEAFH50BUAAAIUfQQAEAFD0Sd3vTBhAAACFH10BSJysRwBR+GHvBAF0AEDhR0cABABQ+BEEIDw5pwDFH/xu0QEAAyjoBiAAgMIPggACACj8IAgQBXsAUPzB7x0dADAQgm4AAgAo/CAIECVLACj+4L5ABwAMcKAbgA4AKP7gfkEHAAxkoBuADgAo/uA+QgAAgxa4n0gKSwAYqCBB95YlAXQAUPzBfQYCAAYlcL/B9lkCwEAECb73LAmgA4DiD+5DEAAw6ID7ET7MEgAGGojo3rQkgA4Aij+4T0EAwKAC7lcQADCYgPsWAQAMIuD+RQAAgwe4jxEAMGgA7mdi4zFADBSQonvbY4LoAKD4g/scAQCDgkEB3O8IABgMAPc9AgAGAcD9jwCAmx8wDiAA4KYHjAcIALjZAeMCAgBucsD4QHi8CCjh/sd/+veZf/EPv97J/0twLwEpZ8rly3/zX/7xwtrKG1f0F/f+w1//386Wwx1JP45/97/++3/+308H/58r+ov/9k//7V//yy++/idJPob/c3sw86/+69+4mDoAVMvfPnmW+GPIZrLZ/r6zX7mavzh9pONEDMU/k8lkvjlx/por+pdu9p1L/O/97588dyEFAKrp7374MYrjUCTeKRAnkl8gfnUsru2v9LQe6TrZ1t5r7EEAYE8ejY5nFlfXBIDIxHQ+vjje97vW+sYWVzWea7tWKGTuDY26mAIA1VQqlzPfPk1+K+5y14mLTXX1ja7oz7PmvnhmzblsNnej78wVV/VtAEj+tb39bDizWSy6mAIA1fZ3EewDqM3V1F7vOXPZ1cxkjjUfOnq+vfO0WW+k4S6CcxHDmIMAEIW//SGOm/Eba8VvZ/9fxXZM/REe0260NTYfvtDRfS7px/H3AoAAQBjuvhjObGxumSWaLQfres/py3U1NXXC3bmvsplsNsnHUCyVMrd+HHKjCgCEYGNzK3Pn+XDyi0Tvmcu1uVxN2q9n/4n4ZssNtXX1V7pOfi7cJb/L9Wh0PLO0tpZBACAQf/sk+Y/kNNfVN13qOnkxzdexua6+6VLniSjPgQ5PHOfg9sLw/zTiCgAE5H7x5X80Q0q+mLsgN0+kex9AY21dw5Xu5HdBvhsfuueVwQIAIaXy/PD9UrlcMkNy/KHqj2D9e+/hribxr1//bnxo0IgrABCItv6WG0uF9ZXHs/nEb8292XfuWpqLxM2Id8sfaWw+/PuOrnNpvbYxhLvR13PjMyuLc2/HHaOvAECVi//b//nW+It7ST+eo00tbb871nU2jdeyNperud4b97sQ+vvOf5XWezWG5a13Z/9CgABAAMX/pwAwdC+G40rrWvGlzhMXm+vqmxTB+NRkc7kYXnT1vkmGECAAEEQ6f3E3jgCQzn0A/SkIPqkNd10nLrbUNzQnfozJxzHJQACIavafyWQysytL8yMLcy/NEpN63PEHnxOH23t6W490pe3axvBFxFerywsv5mdGtzseIQBwQMX/rRj2AaS1SPT3nb2ajmKYvg5PDOHuu/zHd/8LAQIAVSz+mUwmcyv/IooWXdoeBzzf3nm6o7m1PR3FMH0dnhie7tjO439CgABAFcXQAUhjAIjp879pKIY78Vl715ljzYeOJj8AvLD+LwAQ6uw/k8lkRhbmXr59TjfRRSJlASBNgefC8Z7zhxuaWtNzbZMf7lY3C2uPZsafVGqcQgCgwsX/l6Se/Dd1/b6j69zRppa21MyKU7Q7PpvJZvv7zl1Nz7VNfri7OzHycKtUKu7HeIUAQAVvphiWAX4qEmdTURQ7Ww4fO32k40SaftNp2geQhg2AQoAAQCDsA0jc7D99m+JScsw9rUe6Tra19xpTEADY99l/JpPJ/DA78WxpY21ZAHCcofqq+/QXDbV19a5t+LZKpeLdiZGHBzV+IQCwh5unVC6XBiaG7yf9+C93nbjYVFffaDYcn7qamrqvuk99GX8ASP61/X5m/OnqZmHtoMcxBAB26bsIvgtQm6upjeH96R9zqL6h+fPjvb9L42/0ZipefXw+hg8Aaf8LACRh9v9WPPsA4p4df9139mpNNpfK+zD2zkdbY/PhCx3dif/88W42AOoCCABU8WYZnBx7XChuFcwSAz++vnR+HCeTyWT6e89ezWWz0Y5B/X1nr2Yz2WwEHYDBSvxzhAABgANSKG4V7k2Ofp/047jRe/ZKbS5XE+8sOJ1fPsxkMpnWhqZDF4/3fhbr8cWwAXBoYWZ0bnVp3ogqAJCQ2X+lk3s1NdfVN13qPHExxmtdm6upvdZz+lKaf+8xd0C+iWP9v6JjiC6AAMDB3bxR7AOIdZZ8tfvkF421dQ1p/o3G+ghkY21dw5Wuk58n/Thu2QAoAJC82X8mk8kM5IcGS+VySZEINth8lfbffKx7PK71nL5UV1NTl/hJRP7FYKX/mboAAgAHcFMsFdZXfpideBZDkYhhM9Vvg825a2n/3Xcfaus81XasL75rm/zQOrOy+GpkYe5lUsY7BADeEcPjgO1NLUc+O9Z5Jqbrks1ks1/3nr3qFxpnF+CbE+evJ/0YBrT/BQCSOfuPKQDEMqP6tbR97fDjASCua1uTzeVu9Cb/BVb7vf6vCyAAsM9sBAxTf5/1/z9f28ieBLjUdeJiS31Dc+LHjn1Y/0cA4ABT8H6u4x1sByCu9XLr/7/47FjnmfamliPRBJoIru1yYWP18czEj0kf/xAAUi+GZYATh9t7eluPdEVUJHQAfpbNZLP9EXUBYliuujMx/KBYLpX8OgUAEp5+b+XtAwhJT+uRrhOH23vcAXEGohiWNA5y6VAXQABQ/HUAUhMAvknx639jPyeftXedOdZ86GjSj+OgxwwhQABgn4wszL2cWVl8lfTj6I9k3TzNHwD6kMtdJy421dU3Jv7aRtDJ2CoVt+5Njj7yqxQAiCTtxvA0wIWO7nNHGpsPJ3+2awPgu2L5LkIMnYyH0+NP1rc2N9IwLgoApEIMywAxbBY73NDU+vuOnnN+ke+ZPUfQGYnhCYBYlgwRAMz+I7upkz577u87dzWXzbrv3j97TvTb82J5rXE1vyKqCyAAsA9+mJ14trSxthxBkUh0ALip/f9B13vPXK7J5nJ+m9VTzpTLA/nkf0YcAcDs/1dK5XLp9sTIg6SfwyvdJz9P8mYx6/8fdqi+ofnLzr4LAkD1PH81MzK/tvI6reOkAEC0votgGSDJm8Xqa2rrr3af+twv8cOSvIv+G+v/CACEmmpvRfJdgKTOtK71nP6yvqa2PpS/Z3FjbWludWk+rACQzGvb1th8+MLxnvNJv7dCaf/rAggAVNi9ydHvC8WtQvIDQDJnWqHNbm/nhx9Uc8PXe89RXzKvbX/f2avZTDab9HsrtN8DAgAVUihuFQYnxx4n/Thu9J69UpvL1SQwAARV3G6Nv7gb2vshjre0tp89evxU8kJp8tf/p5bfzIy9eZU3UgoAVFBI7awY1via6+qbLnWeuJioGy2bzX3de/ZKULO9/NDgt+PP7wYYlL4SAMz+LQMIAFT+Jo9iH0DS1oovdPScP9zQ1BrK3/O2G/R4ZuLH5cLGalDXNmEvBGqsrWu40nUy8Zs7bQAUAIg8xQ5MDN8vlcuJ/8xn0mZcof29g5NjjwvFrUKxXCrdzg/fd65271rP6Ut1NTV1iZ8cBPj8vy6AAEAFLW2sLf8wO/Es+R2AZM0SQ/t7fz3bC23md/bo8VPHW1rbhbuDHReezE48N0IKAESeXmNo9bU3tRz5rL3rTGICQGBt7e/yvywFhfh+iCQ9DRDD2x1D7gzqAggACADvmXklY+A92dbe29N6pCuUv6dULpdu54f//FbIu5Ojj0J7PLQ/IR2emmwudyOwzZ27CgAe/xMASAcbAQ86qIT1dz6dm3yxuLG29PZ/D/Hx0KS01b/s7LtwqL6hOfmTgiEbAAUAKiXkttXMyuKrkYW5l8nvACSjSIT2CeP3dYBC6wp92dl3oSUBhTWG9f/NYnFzcGrse+OpAEBKxLAMEFprPSlF4n3Pe4fWFfqptX7mcujXNob1/8Gp0ccbW5uJf0MoAoC0ut0AkH/huwAH4GhTS9tnxzrPhB7+BvJDg6FtAkvCRsAkf7wo1PCnCyAAUIVZYDIDQNhF4mbfuWshvSP+5Zv5ianlNzPv/udLhfWV0B4PDT3cnW/vPN3RnJzHFT84FuRtABQASJXhhdmxmZXFV0k/jtA3Aob8/P+7vh1/HtRM8FrP6Uu1uZracMNn8tf/y5lyeSCwF0EhACRWktpUAxHs/L3Q0X3uSGPzYUVim9f8I7O90HaCN9XVN17uCvebDzEEgKdzU0Nv1lcXja8CACkTw6M/2Uw22x/ou+Mba+saQitgH+sAfDf+woeBdva3RfABIO//FwBIZTr1QqD9FVoLe2Ft5c3zVzMjH/q/z64szQ8vzI4FVWT7wpxldx9q6zzVdqwv+QEgeZMAXQABgAp4PJt/tlRYX0l+AAizSAT3+F9+6F45Uy4nKRSG2gGIof3/829i0EgoAJBCP78SNvEbgK50n/y8sbauIbS/K7QW8Xae/AhtWSjUbz7EEADyiwtT+cWFKSOhAMAeJbUtFcMaYG2upvZaz+lLIf1NIb4jfjuz+1vjz4PbBxDiEk8Uz/8nePZvGUAAoCJFYcgLgfbBF529vw/pHfHrW5sbD6fHn3zqvzf6+lV+evnNbFjF9nxQxfZwQ1PrhY6e88m/920AFABItXuTo9+H9iW4XQaA6wLJh92dGHm4VSpuJTEUhraU0t937moum0382DngA0ACgFOwd0luR4X4JbjduNF75nJtLlcTTNEK7NHEnbR7Q5sZnmo71td1qO14OOEu+Y//vVlfXXw6NzVk3BUASLkYWoEt9Q3NX3aeuBDMLDGwInFrB8/4h/h7CKnoxrABcCA/fP9TT4QgAJAC30XSCgylVXzmaMfJzpbDx0I5L8VyqXRnYuThdv/7T2Ynn4f2dribfWHsA2iorau/2n3qi8Tf8x7/QwAgk8lkBiaG74f2Jbgkz8xCmyF+P5N/ulLYWN3ufz/E98OH0gG43nP6cl1NTV3S7xUbABEAKiCGdailjbXl0L4Et7tZYhjr7sGt/+/iy4+hFYiLx3s/a21oOlT1axtB+39ja7Nwfyr5+35iGX8FAMwIKuBY86GjIbw0Jrg3AO7i2ob2e8hls7n+3rNXdSL27t7U2KPNYnHTqIcAwK5niSGq9gDd0dzafvbo8VNBXdv8zvd43J96+Xh9a3MjpOPor/LLd0J8uVOa73UEgKqKqf0Uy5pgtVu0ob0hbnhhdmx2ZWl+p/9/W6Xi1r3J0UdhXdvqntsvO/suhPRyp90HgLjW/y0DCADs0czK4tzo67nx5HcAqh4AEvf+/w/59mVYrwW+1n3qUjU34MXw+F+pXC7dnhh5YMRDACC6LsDJtvbentYjXVULAIFtALyV3/01De2NgNV+BO9mBOv/T2Ynni9trC0b7RAACHrAT9pMrbmuvimklxHttQNwZ2L4wVapVHRt/xwAvnKPIwAQ5bpTNPsAqjQLv9F79kpIryOeXVmaH16YHdvt///qZmHt0cynPyCUhmt77mjn6Y7m1vak3xvf5V8MZiJkH4AAwB4NL8yOzawsvkp+B6A6rdrQHhHbze7/33YQwgqF/X1nr2Yz2Wzar+3ur6cnABAA+IAYvhB24XjP+bbG5sMHPjs9EdoLgPZevL99GVYAaGtsPnyho/vcwQeA5G8AHHvzKj+1/GbGKIcAwHvFsEaYzWSz/X0H+9KY2lyu5nrPmcuxzfa+yw/dC+2jMdV41DOGNwCa/SMAVGIWEvF6Uyz7AA56xnap6+TFprr6xlCOf6Wwsfr9TP7pXv85C2srb569mh4OKwAcbDu+61Db8dNHjvUlPwDE/f5/+wAEAPbo8Wz+2VJhfUUA2Om/L6w14jsTIw+L5VJFPvAUWuFI+7Xd9XX0BUAEAD6mVC6Xbgf2JbjduNp98ovG2rqGA5uV9oXVIr41/uJu5f5ZYS0L9bYe6eo7fLQ71sCxH+bXVl4/fzUzYoRDACBRM77dqM3V1F7rOX3poP59B73n4CBneyEuCx1kUY4hAAzkhwZD28uBAECAvBBoZz5r7zpzrPnQ0VCOu9Lv8c8vLkyNL85PhnRtD+p9AIcbmlovdPScT/49/cILgBAA9ioNG03uTY5+XyhuFSIIANcPpBgF9vjfw+nxJ2ubhfWYQ2H/Aa3L9/edu5rLZhM/TqblCQAbAQUA9qhQ3Crcnxr7IenHcaP3zOWabG7ff+OhtYj3Y7YX2rLQhY7ucwfxrocYNgCubRbWH06H9UZHBAACFsMyQEt9Q/OlrhMXD2CWGM0XAA8yVOzFQb3rIYb1/3uTo4+2SsUtoxoCANsd8O/GcBz7/cx4Z8vhjpCeES9nyuWBfXjc69mr6eH5tZXXIV3b/S7O1f76YMUCocf/EADYiYH88P1SuVxK+nHs92ax0GaIz1/NjOxXoQ5tHXm/r+31ntOX62pq6oR5BABStcFkaWNt+cnsxPOkH8d+F+g0rP+/9e3486AKydXuU1801NbV79c/v78v+Z//LZZLpTsTIw+N0wgA7LCYJH8fwLHmQ0fPt3ee3rdZaGBPAAzsY7v3u8B+D3U1NXXXuk/t27seYlj/fzwz8eNKYWPVaIYAQDCzyRi6AK31jS2fH+/9XVqu2aPp8SehFZP9+khPTTaX+zqwlzul+R5GAMDgEVQA+LrvbFDPiE8tv5l5+WZ+Yr/++SG2k/erA/NFZ+/vD9U3NCf9t28DIAIAuzKzsjg3+npuPOnHsV9PAtxM0fr/r/4dQe0D2K8QFkP7P5PJZAYieasnAgC6ALtyqu1YX/ehts6kzD53Pds7gF36of0e9msZ5mYEAWBkYe7lzMriK6MYAgC7HPB9F+B99nsDWqjF+e7k6MPNYnEz5mubyWQyN/uS/wZA6/8IABWS1kdL7AN4v/1+BG2nljbWlp/OTb7Y73/PxtZm4f7U2OOQrm2lOzHnjnaePt7S2p7033ya1/89CigAUAHDC7NjsytL88kPAJWd0d3sC+3xv4N7cVNoobDS1yKG9/9nMun5ABACAPs6kCT/TWIXjvecr+THY0LbJPZd/uCWakJbFuo61Ha8kq9jjmED4Nzq0vzQwsyo0QsBgKgG/N2o5MdjsplsNrRnxA9yVj6QHwruNdGV/CBTDBsAzf4RAEhccdlPlZrZXejoPnfkAD5Fu12F4lZhcPLg1uUXN9aWQntNdKWubaW7CVUMADYAIgCwd49n88+WCusrAsDPs83A1ogHJ8ceF4pbhYMNhWEVmEptBIxm/d8LgBAAqIRSuVy6kx95kPTjuNJ18vPG2rqGUIJEkgf70LpCn7V3nWlvajmy5yDRd/6rpP/OVzcLa9/PjD81ciEAEOWAvxt1NTV113pO7/nZ/dCeAKjG2/lC/D1UogsQQwfgzsTwg61SqWjUQgCgMrPMSPYB7HWDV2/rka6+w0e7QzmeUrlcup0fPvDuTIivid5rZ6a1oenQxeO9nyX/XtX+RwCggu5NjT066HXm/SkSe5vhhdb+fzo3+WJxY22pGv/ub1+G9XjoXt/e1x/Yx51265YNgAgAleOtUn9+A9wPST+Or3vPXqnJ5nb9uw9u/b+Ks71b+bC6Qpe6Tl5sqqtv3MO1vZ703/dWqVS8OxnWFxuN2wIAEYhhZtFS39D8ZWffhV3PEgNbI67mWnxo+wBqc7ma6z1nLu8+ACR//f/R9Msna5uFdaMVAgCVHvDvxnAcu53FtzU2H77Q0X0uqA5AFR/3+vlrc3MhnY/dbgRsqK2rv9p96vOk/7YP8o2QCACkyEG+b36fi8SuAkB/39mr2Uw2G8pxvHwzPzG59Hq6qgUnsA1nu53FX+s+dam+prY+6b9tGwARANgXSxtry6G9Ae4gZ4mhPf4XwsteQlsGuN5z5nJtLlez89/EeS8AQgCAjw/4yW8xdjS3tp9v7zy989llaBsAq198vw1sWeinPR4nLiT92u7Gi/mZ0VerywtGKQQAUjHj262dDvgNtXX1V7pPBrVGHEK798nsxPOljbXlkM7LTjs1Ndlc7kbfmSvuTQQAEAB+I7Q14oW1lTfPXk0PV/vvKJXLpYH88P2gAsAO9wF80dn7+9b6xpak/6ZtAEQAYF+F+Aa4gygSlfrYTKUM5IcHy5lyOZBQeDewa7uja/VNLOv/NgAiAKAL8Gmn2o71dR9q69x+UTnv+f8P/i1hzTw7mlvbzx3d/h6PGDYAxhLMEQAw0whqppjLZnNf94a1RhzSbu/BqdHHG1ubhSRe20wmk+nvO/uVexIBABI449ut7bZ+Pz/e+7vWhqZDofzd61ubGw+mXgbzWubNYnHz7uTow7Cu7faWeM4ePX6qs+XwseTfkzYAIgBwAIYWZkZnV5bm0xIAQlv/vzc5+mirVNwKawYaVgG62Xf+q0r+BhLQARAAEAA4oAEngh3HFzp6zh9uaGpNWpEIcbYXWlfozNGOk9uZ2cfw/v+lwvrKD7MTz4xKCACkcsa3qx9/Npvr7zt39VP/ve38d9I+27s9MfygWC4F9Zro7Xy4KYYOwJ38SHDnHgGAiMXzPoCPF4mdPi2w34rlUunOxPCD0M7jSmFj9fuZ/NOQ/qZPvRCos+Vwx+kjHScSH8a9/hcBgIP0eGbix+XCxmryA8DHZ4A3A2sRh3zeb70M630An7q28az/2wCIAMABz0RvB/YGuN242n3qi8bauoYPB4DtbSY7sCIb8GAf2t/2RWfv7w/VNzTHHAC2SsWte5Ojj4xICAAoRjtUV1NTd63n9KUPF4mwOgAht3tD+9tqsrncjd6zV5JybXfj/tTLx+tbmxtGIwQADnbAj6T1+KE3wbU3tRzZzVcD99NAwI97vVpdXng+Pz0S1rV9f5FvbWg6dPF472cR3IODGRAAOGj3psYebRaLm0k/jg/NBG+eOPdVNpPNhvJ3jizMvZxZWXwV8rkM7XHAD7X5+/vOXs1ls4kf/255/h8BgGrY2NosDE6NPk76cdzoPXulJpv7zb1ws8/z/7uYkQb1N17rOX2pNldT+55gcD3pv9typlwe8AQAAgBmILt3qL6h+cvOvgvb7QxUrbgmYLD/NrAnARpr6xqudJ/8PPRruxvPXk0Pv15fXTQKIQBQrVnp3RiO493X/TbV1Tde6jpxQQdgZ8YX5ycnll5PB3Vt33kfQH1Nbf3V7lOfJ/036/E/BACqaiA/fL9ULif+LWTvbgS83nPm8vtax9Uyt7o0P7wwO5aQUBj0PoBrPae/rK+prU9+AND+RwCgipY21pafzE48T/pxvNsSDu0DQElaagktAPT3nf2LzZwxtP+T9ptAACBSMbyKtKO5tf3c0V8e+QutSAwkaLYXWmv6aFNL2++OdZ39Jdwl/wVAk0uvp8cX5yeNPggA++zNwModZyE5M769dgFqsrnc9Z4zl53j3flxbnpoYW3lTUh/09uOTi6bzX3dd/Zq0n+r3v9v3BYACKQ4DUUSAH6aGX7Z2Xeh5SOvkD1oIX5o52PKmXI5tM9F9/+8EfCL432/a61vbBG6QQCgAqaX38yOvn6VT/pxvG0Nh/aO+DsTIw+T9rnXUDcCxvMBIB0ABACCGZCSPyM5feRYX9ehtuP9gW0ADG02vb0AENbffLKtvbf7UFtnDBsAFzfWlp7OTb4w6iAAYMZX0ZniuWs3+855A+AePZp++WR1s7AWWhegP4IAcDs//CCGR28RAIgmAMSxD+DfXP6H//x4S2t7KH9PUj/3ulUqFe9OjDwM6W/615f/wT/rbDl8LIKwHcXLtxAAiMTQwszo7MrSfNKP4x+dufBNSH/Pw+nxJ2ubhfUknstvAytUoV3b3fIEAAIAIQ5MdiZX+pwmeLOXneqVVyhuFQYnxx47EwgABFasDPiK6C/uTow83CoVt1zFyhmcHHtcKG4VnAkEABSryCX5c6/rW5sbD6Ze/uAqVjBka/8jABw8b5X6tMczEz8uFzZWnYnKePZqenh+beW1UMivzqcNgMZrAYDwFMul0u388H1nwmzvrW8VrIoplcul2/nhB84EAgBmfLEHgAjO5UB++H45Uy67mnv349zk0OLG2pIzgQCAohX9uUx+B+DN+uri01lvratMuPaUDQIAAbs3NfZos1jcdCb2Zmr5zczYm+R/X0HhqmAgtAEQAYCQbWxtFu5PeU7Z7P/XAUBXyHlEAMBARerOod/D3o0vzk9OLr2ediYQAKrEoyXbHfC1fPfcAYio3Tu1/GYmhs9Fu6eM0wIAfMJAfui+r5Xt3tLG2vKT2YnnUQUaXYA9nj/r/wgAJIDvle8xQE0MRxegLAPsNVS/EAAQADDgp2C2dy++34MW9m69Xl9d/HFuesiZQABAAIg/AEQ324vlc9HVmf0PDXqZEgJAAGwwMePbT4XiVmFwauz7OION1wK7l4zPAgDRm15+M2vn987dnxr7YWNrM8rPvSpkuw5Og84CAgBJG7gM+Irkr47N72GnNrY2Cw+mfVIZAQADfgpCU7wB4PFs/tlSYX3FVd6+u5OjD71aGwEAs9nIlTPl8kB+KNrPKf/8OVufi96BAe//RwAIi40m22Pn9848nZ18EfvnXi0L7TREO1/GZQGApA74eV2A7Q/28Z+rbz0JsG2lcrl0Jz/ywJlAAMCML/6wNBj7MQ5Ojj0uFLcKrvan2TOBAEDCA4A1TGHpF4XiVuHe5Oj3rva27h3hGQEgRNabtuf7mfzT5cLGqjPxceOL85MTKfncq82hwrPxWAAgBYrlUunOxLB1TEXxV4XNstC2zpMnABAAUNzM9mJyOz98v1gu+Vz0R4y+fpWfXn4z60wgAGDG5xxFY6mwvvJ4ZuJHV93vAQEgsaw7bY+3mX3c6/XVxWevpofTdMyeb/9EAPD4rHFYACAGG1ubhftTY4+diQ/N9obupe1zr2a4n/xNDDoLCACY8cU/2xtM3+/BDPdDXq0uLzyfnx5xJhAAAqf9ZMAXjnZubnVpfmhhZtTV/60B30sw/goAxDWoDd0vlct2fr9jfWtz48FUOj/3+u1LXSGBEAGA6C1urC09nZt84Uz8pXuTo4+2SsUthY63bABEAMCAn4bBPsXnxKtuf2tts7D+aPrlE2cCASAhrEMJALs/J+ktgmNvXuWnlt/M+BX84u7kyMOtUqnoTBh3BQAUu4h5TbJQ+C6P/yEAEKXp5Tezo69f5Z2Jnzyemfgx7R9KEgCEZASAxNOO2p4BG5x+me3lX6R+tnfr5Yu7fgk/KZZLpbuTIw+dCeOtAIAZn9le9J7OTQ29Xl9d9GvIZB5Njz9Z8elsBAAEgPgNCACZcqZcHvDZ20wm4/O/CACJpi31aS/mZ0bnVpfm034eRhbmXs6sLL7yi9AJ+VUgFACMswIAkc90DHTW//8iAOgK/dwBcB4QAKTT6ANA6gc6s95fPJh6+cPaZmE9zedgeGF2bHZFZ8z4KgBgxpeGEKQD8LOtUnEr7bvf3RMIAKTC9zP5p2l+/t2X8N5XANPdEbEBEAEgEtpUH5f2N+CZ/ZsBO37jqgCAGV86A4DB/h13JkYepPUd+LMrS/MjC3Mv/QoQAKTVlBTBFH8FT7v3N9L8FTy7/42nAgCpcndy9OFmsbiZtuNeKWysfj8z/tQv4Le+HU/na4G/0/5HACBNNrY2C/enxh6nL/j43OuHpHUd3J4QBIAIaVsZ8H97zNq9HymE98qZcjlNx/xTRyivI2QcFQBQDM320uv1+urij3PTQ2k65jsTIw+L5VLJ1UcAkF5TZSA/dL9ULqdm8NsqlYo+9/qpgJSurpANgMbPasq2/OGvyk7D/mrrb7nhLAAIADoAfsQAGDcFAABAAAAABIA4aGcBGC8FAABAAJBqATBOCgAAgAAg3QIYHxEAAAABQMoFMC4iAAAAAoC0C2A8RADwowcwDiIAAIAAgPQLYPwTAAAAAQApGMC4JwAAAAIA0jCA8U4AwE0BYJwTAAAAAQDpGDC+IQAAAAIAUjJgXEMAcLMAGM8QAAAAAUBqBjCOIQC4eQCMXwgAAIAAIEUDGLcQANxMAMYrAQA3FYBxSgAAAAQApGsA45MAgJsMwLgkAOBmA4xHCAAAgACA1A0YhxAAcPMBxh8EANyEgHEHAQAAEACQxgHjDQIAbkrAOIMAgJsTML4gAOAmBYwrCABuVjcrYDxBAHDTAhhHEADcvADGDwEAABAAkOIB44ZxQwDAzQwYLxAAcFMDxgkEANzcgPEBAQA3OWBcQADAzQ4YDxAAcNMDxgEEANz8gPsfAQCDAOC+RwDAYAC43xEAMCgA7nMqp9Yp4H2DQ1t/yw1nAxR+dAAwWADuZwQADBqA+xgBAIMH4P5FAMAgArhvEQAwmADuVwQADCqA+5Rq8xgguxpcPCYICj86ABhsAPcjAgAGHcB9SOgsAVCRwceSACj86ABgMALcbwgAGJQA9xmhsQTAvgxOlgRA4UcHAIMV4H5CAMCgBbiPqDZLABzI4GVJABR+dAAwmAHuF3QA0A0AFH50ADDIgfsCdADQDQCFHwQABAFQ+KECLAFgMAS/d3QAQDcAFH4EABAEQOFHAABBABR+4mAPAAZR8LtFBwB0A0DhJw2ymUwm0/KHvyo7FSSJIIDCD7u38qc/ZnUA0BEAhZ8UEgAQBEDhRwCA5A/GwgCKPggA6AqAwg8CAIIAKPwgAJC6QVwYQNGHn2Tf/g8eBSRNBAEUftJq5U9/zOoAYLAXBvwOIKUEABQBewUUfhAAQFEQBhR9EABAsRAGFH2IUvbX/4uNgPBpAoGCD0n1dgOgDgDoDij6kFICAFSw+AgECj4IAKA4CQQKPgQr++5/YB8A7C+hQLGHavj1+r8OAARS5NIYChR7qC4BAAIvhkkOB4o8hCv7vv/QMgAkz0EGBYUdkuXd9r8OAEREUQZ2IucUAIAAAACkNQC8b60AAEieD9V0HQAA0AHQBQCA2Gf/OgAAoAMAAAgAGcsAAJBUn6rhOgAAoAOgCwAAsc/+dQAAQAdAFwAA0jD71wEAAB0AAEAAeIdlAAAI205qtQ4AAOgA6AIAQOyz/111AIQAAEh28d9VAAAAkm9XAUAXAACSO/vXAQAAHQBdAABIw+xfBwAAdAB0AQAgDbP/inQAhAAASFbxr0gAAACSpyIBQBcAAJIz+69oB0AIAIBkFP+KBgAhAACSUfwrHgAAgGSoeADQBQCA8GtrLil/KAAo/oEHACEAAMKupfYAAEAK7WsA0AUAgDBraC7pBwAAin+AAUAIAIDwamYutgMCAMU/oAAgBABAODUyF/sBAoDiH0AAEAIAoPo1MZe2AwaAtBf/qgYAIQAAxb96cmk/AQCQxtqXcyIAIH01L+eEAED6al3OiQGA9NW4nBMEAOmrbUEX25Y//FXZzwYAhT8FHQDdAAAU/5QHACEAAMV/fySquFoSAEDhT0kHQDcAADUq5QFACABAbaqMRBdTSwIAKPwp6QDoBgCgBqW8A6AbAIDCn/IAIAgAoPCnOAAIAgAo/J+Wc8EAIH21JBVFUjcAAIU/hQFAGABA0U95ABAEAEhz4U99ABAEABT+NB+/jXLCAICiLwAgCAAo/AIAAgGAgi8AIAwAKPoCAAIBgIIvACAUACj2AgDCAYAiH6z/D0KznYmI5s2ZAAAAAElFTkSuQmCC\", \"sizes\": \"512x512\", \"type\": \"image/png\", \"purpose\": \"any maskable\"}], \"categories\": [\"lifestyle\", \"entertainment\", \"travel\"], \"lang\": \"en-NZ\"}";
  const _blob = new Blob([_manifest], {type: 'application/manifest+json'});
  document.querySelector('link[rel="manifest"]') && document.querySelector('link[rel="manifest"]').remove();
  const _mlink = document.createElement('link');
  _mlink.rel = 'manifest'; _mlink.href = URL.createObjectURL(_blob);
  document.head.appendChild(_mlink);

let currentRegion = 'all';
  let currentDuration = 'all';
  let walkTopRatedOnly = false;
  let foodRatingFilter = 'all';
  let kidFriendlyFilter = 'all';

  // ── FOOD: top-rated filter ──
  function filterFood(rating, btn) {
    foodRatingFilter = rating;
    document.querySelectorAll('.duration-filter button[onclick*="filterFood"]').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    applyFoodFilters();
  }

  // ── FOOD: kid-friendly filter ──
  function filterKidFriendly(val, btn) {
    kidFriendlyFilter = val;
    document.querySelectorAll('.duration-filter button[onclick*="filterKidFriendly"]').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    applyFoodFilters();
  }

  function applyFoodFilters() {
    document.querySelectorAll('#section-food .venue-card').forEach(card => {
      const regionMatch = currentRegion === 'all' || card.dataset.region === currentRegion;
      const rating = parseFloat(card.dataset.rating || '0');
      const ratingMatch = foodRatingFilter === 'all' || rating >= 4.5;
      const kidMatch = kidFriendlyFilter === 'all' || card.dataset.kidfriendly === 'true';
      card.classList.toggle('hidden', !(regionMatch && ratingMatch && kidMatch));
    });
    document.querySelectorAll('#section-food .venue-grid').forEach(grid => {
      const hasVisible = grid.querySelectorAll('.venue-card:not(.hidden)').length > 0;
      const label = grid.previousElementSibling;
      if (label && label.classList.contains('day-label')) label.style.display = hasVisible ? '' : 'none';
      grid.style.display = hasVisible ? '' : 'none';
    });
  }

  // ── WALKS: top-rated toggle ──
  function toggleWalkTopRated(btn) {
    walkTopRatedOnly = !walkTopRatedOnly;
    btn.classList.toggle('active', walkTopRatedOnly);
    btn.setAttribute('aria-pressed', walkTopRatedOnly ? 'true' : 'false');
    applyWalkFilters();
  }

  function filterDuration(duration, btn) {
    currentDuration = duration;
    document.querySelectorAll('.duration-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    applyWalkFilters();
  }

  function applyWalkFilters() {
    document.querySelectorAll('#section-walks .venue-card').forEach(card => {
      const regionMatch = currentRegion === 'all' || card.dataset.region === currentRegion;
      const dur = card.dataset.duration;
      const durationMatch = currentDuration === 'all' || dur === currentDuration;
      const rating = parseFloat(card.dataset.rating || '0');
      const ratingMatch = !walkTopRatedOnly || rating >= 4.5;
      card.classList.toggle('hidden', !(regionMatch && durationMatch && ratingMatch));
    });
    document.querySelectorAll('#section-walks .venue-grid').forEach(grid => {
      const hasVisible = grid.querySelectorAll('.venue-card:not(.hidden)').length > 0;
      const label = grid.previousElementSibling;
      if (label && label.classList.contains('day-label')) label.style.display = hasVisible ? '' : 'none';
      grid.style.display = hasVisible ? '' : 'none';
    });
  }

  // ── CHANGE 3: Focus trap helpers ──
  const FOCUSABLE = 'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])';

  function trapFocus(el) {
    const focusable = [...el.querySelectorAll(FOCUSABLE)];
    const first = focusable[0], last = focusable[focusable.length - 1];
    el._trapHandler = function(e) {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last.focus(); } }
      else            { if (document.activeElement === last)  { e.preventDefault(); first.focus(); } }
    };
    el.addEventListener('keydown', el._trapHandler);
    if (first) first.focus();
  }
  function releaseFocus(el) {
    if (el._trapHandler) el.removeEventListener('keydown', el._trapHandler);
  }

  function toggleMenu() {
    const panel = document.getElementById('dropdownPanel');
    const isOpen = panel.classList.contains('open');
    isOpen ? closeMenu() : openMenu();
  }
  function openMenu() {
    const btn = document.getElementById('hamburgerBtn');
    const panel = document.getElementById('dropdownPanel');
    document.getElementById('dropdownMenu').classList.add('open');
    panel.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
    btn.setAttribute('aria-label', 'Close menu');
    trapFocus(panel);
    // Close on Escape
    panel._escHandler = (e) => { if (e.key === 'Escape') closeMenu(); };
    document.addEventListener('keydown', panel._escHandler);
  }
  function closeMenu() {
    const btn = document.getElementById('hamburgerBtn');
    const panel = document.getElementById('dropdownPanel');
    document.getElementById('dropdownMenu').classList.remove('open');
    panel.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Open menu');
    releaseFocus(panel);
    if (panel._escHandler) document.removeEventListener('keydown', panel._escHandler);
    btn.focus();
  }

  function showSectionFromMenu(section) {
    const btns = document.querySelectorAll('.main-nav-btn');
    const map = { events: 0, food: 1, walks: 2, parks: 3, planner: 4 };
    if (section === 'about') {
      // About has no tab — just show the section directly
      document.querySelectorAll('.app-section').forEach(s => s.classList.remove('active'));
      document.querySelectorAll('.main-nav-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      document.getElementById('section-about').classList.add('active');
      document.querySelector('.tabs-bar').style.display = 'none';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (section === 'planner') {
      handlePlannerTabClick(btns[map.planner]);
      return;
    }
    const btn = map[section] !== undefined ? btns[map[section]] : null;
    if (btn) showSection(section, btn);
  }

  // ── CHANGE 5: URL hash state ──
  function updateHash(section, region) {
    try {
      const params = new URLSearchParams();
      if (section && section !== 'events') params.set('s', section);
      if (region && region !== 'all') params.set('r', region);
      history.replaceState(null, '', window.location.pathname + (params.toString() ? '?' + params.toString() : ''));
    } catch (e) {
      // Silently ignore — happens when opened as a local file rather than served
    }
  }

  function readHash() {
    const params = new URLSearchParams(window.location.search);
    const section = params.get('s') || 'events';
    const region  = params.get('r') || 'all';
    return { section, region };
  }

  function showSection(section, btn) {
    document.querySelectorAll('.app-section').forEach(s => s.classList.remove('active'));
    // ── Change 3: update aria-selected on tabs ──
    document.querySelectorAll('.main-nav-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    document.getElementById('section-' + section).classList.add('active');
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    document.querySelector('.tabs-bar').style.display = section === 'events' ? '' : 'none';
    applyFilter(currentRegion);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    updateHash(section, currentRegion);
  }

  function showTab(id, btn) {
    document.querySelectorAll('.weekend-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
    document.getElementById(id).classList.add('active');
    btn.classList.add('active');
    btn.setAttribute('aria-selected', 'true');
    applyFilter(currentRegion);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function filterRegion(region, btn) {
    currentRegion = region;
    // ── Change 3: update aria-pressed on filter buttons ──
    document.querySelectorAll('.filter-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    applyFilter(region);
    // ── Change 5: update URL ──
    const activeSection = document.querySelector('.app-section.active')?.id?.replace('section-', '') || 'events';
    updateHash(activeSection, region);
  }

  function applyFilter(region) {
    const activePanel = document.querySelector('.weekend-panel.active');
    if (activePanel) {
      activePanel.querySelectorAll('.card').forEach(card => {
        card.classList.toggle('hidden', region !== 'all' && card.dataset.region !== region);
      });
      activePanel.querySelectorAll('.events-grid').forEach(grid => {
        const existing = grid.nextElementSibling;
        if (existing && existing.classList.contains('no-results')) existing.remove();
        if (grid.querySelectorAll('.card:not(.hidden)').length === 0) {
          const msg = document.createElement('p');
          msg.className = 'no-results';
          msg.style.cssText = 'color:#bbb;font-size:13px;padding:12px 0 24px;font-style:italic;';
          msg.textContent = 'No events in this area for this day.';
          grid.after(msg);
        }
      });
    }
    document.querySelectorAll('.venue-card, .banner-sponsored').forEach(card => {
      // Skip food & walk cards — handled by their own filter functions
      if (card.closest('#section-walks') || card.closest('#section-food')) return;
      const alwaysShow = card.dataset.region === 'all';
      card.classList.toggle('hidden', !alwaysShow && region !== 'all' && card.dataset.region !== region);
    });

    // Food and walk cards use combined region + rating/duration filters
    applyFoodFilters();
    applyWalkFilters();
    document.querySelectorAll('#section-parks .venue-grid').forEach(grid => {
      const hasVisible = grid.querySelectorAll('.venue-card:not(.hidden)').length > 0;
      const label = grid.previousElementSibling;
      if (label && label.classList.contains('day-label')) label.style.display = hasVisible ? '' : 'none';
      grid.style.display = hasVisible ? '' : 'none';
    });
  }

  // ── CHANGE 5: Restore state from URL on load ──
  document.addEventListener('DOMContentLoaded', () => {
    const { section, region } = readHash();

    // Restore section
    if (section !== 'events') {
      const navBtns = document.querySelectorAll('.main-nav-btn');
      const map = { food: 1, walks: 2, parks: 3, planner: 4 };
      if (map[section] !== undefined) showSection(section, navBtns[map[section]]);
    }

    // Restore region
    if (region !== 'all') {
      const filterBtns = document.querySelectorAll('.filter-btn');
      filterBtns.forEach(btn => {
        if (btn.textContent.toLowerCase().includes(region.replace('-', ' ')) ||
            btn.getAttribute('onclick')?.includes("'" + region + "'")) {
          filterRegion(region, btn);
        }
      });
    }

    // ── Arrow key navigation for tablists ──
    document.querySelectorAll('[role="tablist"]').forEach(tablist => {
      tablist.addEventListener('keydown', (e) => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
        const tabs = [...tablist.querySelectorAll('[role="tab"]')];
        const current = tabs.indexOf(document.activeElement);
        if (current === -1) return;
        e.preventDefault();
        let next;
        if (e.key === 'ArrowRight') next = (current + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') next = (current - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = tabs.length - 1;
        tabs[next].focus();
        tabs[next].click();
      });
    });
  });

// ═══════════════════════════════════════════════════════
  // ✏️  FIREBASE SETUP — only needed for cross-device sync
  //
  //  The planner works RIGHT NOW for guests (saves locally).
  //  To enable Google sign-in and cloud sync:
  //
  //  1. Go to https://console.firebase.google.com
  //  2. Create a project → Add a web app → copy the config
  //  3. Authentication → Sign-in methods → Enable Google
  //  4. Firestore Database → Create database (test mode)
  //  5. Paste your config values below and deploy
  // ═══════════════════════════════════════════════════════
  const firebaseConfig = {
    apiKey:            "YOUR_API_KEY",
    authDomain:        "YOUR_PROJECT.firebaseapp.com",
    projectId:         "YOUR_PROJECT",
    storageBucket:     "YOUR_PROJECT.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId:             "YOUR_APP_ID"
  };

  // ── Initialise Firebase (silently skipped if not configured) ──
  let firebaseReady = false;
  let db = null, auth = null;
  try {
    if (!firebaseConfig.apiKey.startsWith('YOUR_')) {
      firebase.initializeApp(firebaseConfig);
      auth = firebase.auth();
      db   = firebase.firestore();
      firebaseReady = true;
    }
  } catch (e) {
    console.warn('Firebase init failed:', e);
  }

  // ═══════════════════════════════════════
  //  AUTH STATE
  // ═══════════════════════════════════════
  let currentUser = null;

  function openLoginModal()  { document.getElementById('loginOverlay').classList.add('open'); }
  function closeLoginModal() { document.getElementById('loginOverlay').classList.remove('open'); }

  // Guest — just close modal and use localStorage
  function continueAsGuest() {
    closeLoginModal();
    showToast('Planning as guest — your plan saves on this device');
    renderPlan();
  }

  async function signInWithGoogle() {
    if (!firebaseReady) {
      showToast('Firebase not set up yet — planning as guest for now');
      continueAsGuest();
      return;
    }
    const btn = document.getElementById('googleSignInBtn');
    btn.textContent = 'Signing in…';
    btn.disabled = true;
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      await auth.signInWithPopup(provider);
      closeLoginModal();
    } catch (e) {
      btn.disabled = false;
      btn.innerHTML = `<svg class="login-provider-icon" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 0 1 9.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.99 23.99 0 0 0 0 24c0 3.77.87 7.35 2.56 10.56l7.97-5.97z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 5.97C6.51 42.62 14.62 48 24 48z"/></svg>Continue with Google`;
      if (e.code !== 'auth/popup-closed-by-user') {
        showToast('Sign-in failed — please try again');
        console.error('Google sign-in error:', e);
      }
    }
  }

  async function signOutUser() {
    closeUserDropdown();
    if (firebaseReady && auth) await auth.signOut();
    currentUser = null;
    updateAuthUI(null);
    showToast('Signed out');
  }

  function updateAuthUI(user) {
    const signInBtn = document.getElementById('authSignInBtn');
    const userArea  = document.getElementById('authUserArea');
    const avatarBtn = document.getElementById('authAvatarBtn');
    const nameEl    = document.getElementById('userDropdownName');
    const emailEl   = document.getElementById('userDropdownEmail');

    if (user) {
      signInBtn.style.display = 'none';
      userArea.style.display  = 'block';
      nameEl.textContent  = user.displayName || 'Signed in';
      emailEl.textContent = user.email || '';
      // Show avatar photo or initials
      const initial = (user.displayName || 'U')[0].toUpperCase();
      if (user.photoURL) {
        avatarBtn.style.backgroundImage = `url(${user.photoURL})`;
        avatarBtn.style.backgroundSize  = 'cover';
        avatarBtn.textContent = '';
      } else {
        avatarBtn.textContent = initial;
      }
      // Hide sync nudge once signed in
      document.getElementById('plannerSyncNudge').style.display = 'none';
    } else {
      signInBtn.style.display = 'flex';
      userArea.style.display  = 'none';
    }
  }

  // Listen for Firebase auth state changes
  if (firebaseReady) {
    auth.onAuthStateChanged(async user => {
      currentUser = user;
      updateAuthUI(user);
      if (user) {
        await loadPlan();
        renderPlan();
        updateAddButtons();
        showToast(`Welcome back, ${user.displayName?.split(' ')[0] || 'there'} 👋`);
      }
    });
  }

  // ── User dropdown ──
  function toggleUserDropdown() {
    document.getElementById('userDropdown').classList.toggle('open');
  }
  function closeUserDropdown() {
    document.getElementById('userDropdown').classList.remove('open');
  }
  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    const dd = document.getElementById('userDropdown');
    const area = document.getElementById('authUserArea');
    if (dd && area && !area.contains(e.target)) dd.classList.remove('open');
  });

  // ═══════════════════════════════════════
  //  PLANNER — Data & Persistence
  // ═══════════════════════════════════════
  let planItems = []; // Array of { id, title, time, location, category, day, section, region, addedAt }

  function generateItemId(title) {
    return title.replace(/[^a-z0-9]/gi, '-').toLowerCase().substring(0, 60) + '-' + Date.now().toString(36);
  }

  function getCardData(cardEl) {
    const isVenueCard = cardEl.classList.contains('venue-card');
    let title, time, location, category, region, section;

    if (isVenueCard) {
      title    = cardEl.querySelector('.venue-name')?.textContent?.trim() || '';
      time     = cardEl.querySelector('.walk-duration')?.textContent?.trim() || '';
      location = cardEl.querySelector('.venue-location')?.textContent?.trim()?.replace('📍 ', '') || '';
      category = cardEl.querySelector('.venue-tag')?.textContent?.trim() || '';
      region   = cardEl.dataset.region || '';
      section  = cardEl.closest('#section-food') ? 'food' :
                 cardEl.closest('#section-walks') ? 'walks' :
                 cardEl.closest('#section-parks') ? 'parks' : 'other';
    } else {
      title    = cardEl.querySelector('.card-title')?.textContent?.trim() || '';
      time     = '';
      location = '';
      category = cardEl.querySelector('.card-cat')?.textContent?.trim() || '';
      region   = cardEl.dataset.region || '';
      section  = 'events';
      // Extract time and location from meta rows
      cardEl.querySelectorAll('.meta-row').forEach(row => {
        const text = row.textContent.trim();
        if (text.includes('🕐')) time = text.replace('🕐', '').trim();
        if (text.includes('📍')) location = text.replace('📍', '').trim();
      });
    }

    return { title, time, location, category, region, section };
  }

  function addToPlan(cardEl) {
    const data = getCardData(cardEl);
    // Check if already added (by title match)
    if (planItems.some(item => item.title === data.title)) {
      showToast('Already in your plan');
      return;
    }

    const item = {
      id: generateItemId(data.title),
      ...data,
      day: 'saturday', // default — user can change
      addedAt: Date.now()
    };

    planItems.push(item);
    savePlan();
    renderPlan();
    updateAddButtons();
    showToast('Added to your weekend plan ✓');
  }

  function removeFromPlan(itemId) {
    planItems = planItems.filter(i => i.id !== itemId);
    savePlan();
    renderPlan();
    updateAddButtons();
    showToast('Removed from plan');
  }

  function changeDay(itemId, newDay) {
    const item = planItems.find(i => i.id === itemId);
    if (item) {
      item.day = newDay;
      savePlan();
      renderPlan();
    }
  }

  function clearPlan() {
    if (!confirm('Clear your entire weekend plan?')) return;
    planItems = [];
    savePlan();
    renderPlan();
    updateAddButtons();
    showToast('Plan cleared');
  }

  function movePlanItem(itemId, direction) {
    const idx = planItems.findIndex(i => i.id === itemId);
    if (idx === -1) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= planItems.length) return;
    [planItems[idx], planItems[newIdx]] = [planItems[newIdx], planItems[idx]];
    savePlan();
    renderPlan();
  }

  // ── Persist to Firestore (or localStorage fallback) ──
  async function savePlan() {
    updatePlanBadge();
    if (firebaseReady && currentUser) {
      try {
        await db.collection('plans').doc(currentUser.uid).set({
          items: planItems,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } catch (e) {
        console.warn('Firestore save failed, using localStorage', e);
        localStorage.setItem('wow_plan', JSON.stringify(planItems));
      }
    } else {
      localStorage.setItem('wow_plan', JSON.stringify(planItems));
    }
  }

  async function loadPlan() {
    if (firebaseReady && currentUser) {
      try {
        const doc = await db.collection('plans').doc(currentUser.uid).get();
        if (doc.exists && doc.data().items) {
          planItems = doc.data().items;
        } else {
          // Check localStorage for items added before sign-in
          const local = localStorage.getItem('wow_plan');
          if (local) {
            planItems = JSON.parse(local);
            await savePlan(); // migrate to Firestore
            localStorage.removeItem('wow_plan');
          }
        }
      } catch (e) {
        console.warn('Firestore load failed', e);
        const local = localStorage.getItem('wow_plan');
        planItems = local ? JSON.parse(local) : [];
      }
    } else {
      const local = localStorage.getItem('wow_plan');
      planItems = local ? JSON.parse(local) : [];
    }
    renderPlan();
    updateAddButtons();
  }

  // ── Render plan timeline ──
  function renderPlan() {
    const container = document.getElementById('plannerTimeline');
    const emptyEl   = document.getElementById('plannerEmpty');
    const nudge     = document.getElementById('plannerSyncNudge');

    // Show sign-in nudge for guests who have items
    if (nudge) nudge.style.display = (!currentUser && planItems.length > 0) ? 'flex' : 'none';

    if (planItems.length === 0) {
      container.innerHTML = '';
      emptyEl.style.display = 'block';
      updatePlanBadge();
      return;
    }
    emptyEl.style.display = 'none';

    const saturday = planItems.filter(i => i.day === 'saturday');
    const sunday   = planItems.filter(i => i.day === 'sunday');

    let html = '';

    if (saturday.length > 0) {
      html += renderDaySection('Saturday', saturday);
    }
    if (sunday.length > 0) {
      html += renderDaySection('Sunday', sunday);
    }

    container.innerHTML = html;
    updatePlanBadge();
  }

  function renderDaySection(dayLabel, items) {
    const dayValue = dayLabel.toLowerCase();
    const otherDay = dayValue === 'saturday' ? 'sunday' : 'saturday';
    const otherLabel = dayValue === 'saturday' ? 'Sun' : 'Sat';

    let html = `<div class="plan-day-section">
      <div class="plan-day-title"><span class="pip"></span>${dayLabel}<span class="line"></span></div>
      <div class="plan-items">`;

    items.forEach((item, idx) => {
      const sectionIcon = { events: '🗓', food: '☕', walks: '🌿', parks: '🛝', other: '📌' }[item.section] || '📌';
      html += `
        <div class="plan-item" draggable="true" data-item-id="${item.id}">
          <div class="plan-item-grip" title="Drag to reorder">⠿</div>
          <div class="plan-item-content">
            <div class="plan-item-title">${escapeHtml(item.title)}</div>
            <div class="plan-item-meta">
              <span>${sectionIcon} ${escapeHtml(item.category)}</span>
              ${item.time ? '<span>🕐 ' + escapeHtml(item.time) + '</span>' : ''}
              ${item.location ? '<span>📍 ' + escapeHtml(item.location) + '</span>' : ''}
            </div>
          </div>
          <select class="plan-day-select" onchange="changeDay('${item.id}', this.value)" title="Move to another day">
            <option value="saturday" ${dayValue === 'saturday' ? 'selected' : ''}>Sat</option>
            <option value="sunday" ${dayValue === 'sunday' ? 'selected' : ''}>Sun</option>
          </select>
          <button class="plan-item-remove" onclick="removeFromPlan('${item.id}')" title="Remove">✕</button>
        </div>`;
    });

    html += '</div></div>';
    return html;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ── Plan badge count ──
  function updatePlanBadge() {
    const badge = document.getElementById('planCountBadge');
    if (!badge) return;
    const count = planItems.length;
    badge.textContent = count;
    badge.classList.toggle('visible', count > 0);
  }

  // ── Share plan ──
  function sharePlan() {
    if (planItems.length === 0) { showToast('Nothing to share yet'); return; }
    let text = '🗓 My Wellington Weekend Plan\n\n';
    const saturday = planItems.filter(i => i.day === 'saturday');
    const sunday   = planItems.filter(i => i.day === 'sunday');
    if (saturday.length) {
      text += '📅 SATURDAY\n';
      saturday.forEach(i => { text += `• ${i.title}${i.time ? ' — ' + i.time : ''}${i.location ? ' @ ' + i.location : ''}\n`; });
      text += '\n';
    }
    if (sunday.length) {
      text += '📅 SUNDAY\n';
      sunday.forEach(i => { text += `• ${i.title}${i.time ? ' — ' + i.time : ''}${i.location ? ' @ ' + i.location : ''}\n`; });
    }
    text += '\nPlanned on whatsonwellington.co.nz';

    if (navigator.share) {
      navigator.share({ title: 'My Wellington Weekend', text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => showToast('Plan copied to clipboard'));
    }
  }

  // ═══════════════════════════════════════
  //  ADD-TO-PLAN BUTTONS — Injected on cards
  // ═══════════════════════════════════════
  function injectAddButtons() {
    // Event cards
    document.querySelectorAll('.card-footer').forEach(footer => {
      if (footer.querySelector('.add-to-plan-btn')) return;
      const btn = document.createElement('button');
      btn.className = 'add-to-plan-btn';
      btn.textContent = '+ Plan';
      btn.onclick = function(e) { e.preventDefault(); addToPlan(this.closest('.card')); };
      footer.prepend(btn);
    });
    // Venue cards (food, walks, parks)
    document.querySelectorAll('.venue-footer').forEach(footer => {
      if (footer.querySelector('.add-to-plan-btn')) return;
      const btn = document.createElement('button');
      btn.className = 'add-to-plan-btn';
      btn.textContent = '+ Plan';
      btn.onclick = function(e) { e.preventDefault(); addToPlan(this.closest('.venue-card')); };
      footer.prepend(btn);
    });
  }

  function updateAddButtons() {
    const addedTitles = new Set(planItems.map(i => i.title));

    document.querySelectorAll('.add-to-plan-btn').forEach(btn => {
      const card = btn.closest('.card') || btn.closest('.venue-card');
      if (!card) return;
      const title = card.querySelector('.card-title')?.textContent?.trim() ||
                    card.querySelector('.venue-name')?.textContent?.trim() || '';
      if (addedTitles.has(title)) {
        btn.classList.add('added');
        btn.textContent = 'In plan';
      } else {
        btn.classList.remove('added');
        btn.textContent = '+ Plan';
      }
    });
  }

  // ── Planner tab click handler ──
  function handlePlannerTabClick(btn) {
    showSection('planner', btn);
  }

  // ── Toast notification ──
  function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 2800);
  }

  // ── Drag and drop for plan items ──
  document.addEventListener('dragstart', (e) => {
    const item = e.target.closest('.plan-item');
    if (!item) return;
    item.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.dataset.itemId);
  });
  document.addEventListener('dragend', (e) => {
    const item = e.target.closest('.plan-item');
    if (item) item.classList.remove('dragging');
  });
  document.addEventListener('dragover', (e) => {
    const target = e.target.closest('.plan-item');
    if (!target || target.classList.contains('dragging')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const container = target.closest('.plan-items');
    const dragging = container?.querySelector('.dragging');
    if (!dragging || !container) return;
    const siblings = [...container.querySelectorAll('.plan-item:not(.dragging)')];
    const next = siblings.find(s => {
      const rect = s.getBoundingClientRect();
      return e.clientY < rect.top + rect.height / 2;
    });
    container.insertBefore(dragging, next || null);
  });
  document.addEventListener('drop', (e) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('text/plain');
    // Rebuild order from DOM
    const newOrder = [];
    document.querySelectorAll('.plan-item').forEach(el => {
      const id = el.dataset.itemId;
      const item = planItems.find(i => i.id === id);
      if (item) newOrder.push(item);
    });
    if (newOrder.length === planItems.length) {
      planItems = newOrder;
      savePlan();
    }
  });

  // ── Inject buttons and load guest plan on startup ──
  document.addEventListener('DOMContentLoaded', () => {
    injectAddButtons();
    // If Firebase is not configured, load from localStorage immediately
    // If Firebase IS configured, onAuthStateChanged handles it after sign-in
    if (!firebaseReady) {
      loadPlan().then(() => { renderPlan(); updateAddButtons(); });
    } else {
      // Still load localStorage for guests who haven't signed in yet
      loadPlan().then(() => { renderPlan(); updateAddButtons(); });
    }
  });
